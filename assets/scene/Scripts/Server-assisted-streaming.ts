
import { engine, Entity, VideoPlayer, Schemas } from '@dcl/sdk/ecs'
import { isServer, registerMessages } from '@dcl/sdk/network'
import { getSceneAdmins } from '@dcl/asset-packs/dist/admin-toolkit-ui/ModerationControl/api'
import { Storage } from '@dcl/sdk/server'
import { isPreview } from '@dcl/asset-packs/dist/admin-toolkit-ui/fetch-utils'

// Define message types for VideoPlayer state synchronization
enum MessageType {
  VIDEO_PLAYER_SYNC = 'VIDEO_PLAYER_SYNC'
}

const FLAG_CHECK_ADMIN_ADDRESSES = true

// Define message schema for VideoPlayer state
const Messages = {
  [MessageType.VIDEO_PLAYER_SYNC]: Schemas.Map({
    src: Schemas.String,
    playing: Schemas.Boolean,
    loop: Schemas.Optional(Schemas.Boolean)
  })
}

// Register messages and create room (must be done before class instantiation)
const room = registerMessages(Messages)

// Storage key for VideoPlayer state
const STORAGE_KEY = 'videoPlayerState'

export class ServerAssistedStreaming {
  private lastValidState: { src: string; playing: boolean; loop?: boolean } | null = null
  private syncTimer: number = 0
  private readonly storageKey: string
  private adminAddresses: Set<string> = new Set()
  private adminCheckTimer: number = 0

  constructor(
    public src: string,
    public entity: Entity,
    public syncForceInterval: number = 10
  ) {
    // Create unique storage key for this entity
    this.storageKey = `${STORAGE_KEY}_${entity}`
  }

  /**
   * Start function - called when the script is initialized
   */
  async start() {
    // Script initialization
    console.log("ServerAssistedStreaming initialized for entity:", this.entity);
    
    if (isServer()) {
      await this.setupServerValidation()
    } else {
      this.setupClientSync()
    }
  }

  /**
   * Setup server-side validation for VideoPlayer component changes
   */
  private async setupServerValidation() {
    // Load initial state from storage
    const storedState = await Storage.get<string>(this.storageKey)
    if (storedState) {
      try {
        const parsedState = JSON.parse(storedState)
        this.lastValidState = {
          src: parsedState.src,
          playing: parsedState.playing ?? false,
          ...(parsedState.loop !== undefined && { loop: parsedState.loop })
        }
        
        // Apply stored state to VideoPlayer component
        const videoData: { src: string; playing: boolean; loop?: boolean } = {
          src: this.lastValidState.src,
          playing: this.lastValidState.playing
        }
        if (this.lastValidState.loop !== undefined) {
          videoData.loop = this.lastValidState.loop
        }
        VideoPlayer.createOrReplace(this.entity, videoData)
        console.log("[SERVER] Loaded VideoPlayer state from storage:", this.lastValidState)
      } catch (error) {
        console.error("[SERVER] Error parsing stored VideoPlayer state:", error)
      }
    } else {
      // No stored state - use current VideoPlayer state
      const initialVideo = VideoPlayer.getOrNull(this.entity)
      if (initialVideo) {
        this.lastValidState = {
          src: initialVideo.src,
          playing: initialVideo.playing ?? false,
          ...(initialVideo.loop !== undefined && { loop: initialVideo.loop })
        }
        // Save initial state to storage
        await this.saveStateToStorage()
      }
    }

    // Fetch and cache admin addresses initially
    await this.updateAdminAddresses()

    // Validate changes before they happen - only allow admin changes
    VideoPlayer.validateBeforeChange(this.entity, (value) => {
      // Check if the sender's address is in the admin list
      const senderAddress = value.senderAddress.toLowerCase()
      if (!this.adminAddresses.has(senderAddress) && !isPreview() && FLAG_CHECK_ADMIN_ADDRESSES ) {
        console.log("[SERVER] Unauthorized VideoPlayer change blocked from:", senderAddress)
        return false
      }

      return true
    })

    // Monitor changes to VideoPlayer component (only authorized changes will reach here)
    VideoPlayer.onChange(this.entity, async (component) => {
      if (component === undefined) {
        return
      }

      // Update last valid state and save to storage
      this.lastValidState = {
        src: component.src,
        playing: component.playing ?? false,
        ...(component.loop !== undefined && { loop: component.loop })
      }
      await this.saveStateToStorage()
      console.log("[SERVER] VideoPlayer change saved to storage")
    })

    // System to periodically sync state to clients and update admin status
    engine.addSystem((dt) => {
      // Periodic state synchronization
      this.syncTimer += dt
      if (this.syncTimer >= this.syncForceInterval) {
        this.syncTimer = 0
        this.broadcastState()
      }

      // Periodically update admin addresses cache (every 10 seconds)
      this.adminCheckTimer += dt
      if (this.adminCheckTimer >= 10) {
        this.adminCheckTimer = 0
        this.updateAdminAddresses()
      }
    })
  }

  /**
   * Setup client-side state synchronization
   */
  private setupClientSync() {
    // Listen for state updates from server
    room.onMessage(MessageType.VIDEO_PLAYER_SYNC, (data) => {
      const currentVideo = VideoPlayer.getOrNull(this.entity)
      
      // Check if local state differs from server state
      const stateDiffers = 
        !currentVideo ||
        currentVideo.src !== data.src ||
        currentVideo.playing !== data.playing ||
        currentVideo.loop !== data.loop

      if (stateDiffers) {
        // Update local VideoPlayer to match server state
        const updateData: { src: string; playing: boolean; loop?: boolean } = {
          src: data.src,
          playing: data.playing
        }
        if (data.loop !== undefined) {
          updateData.loop = data.loop
        }
        VideoPlayer.createOrReplace(this.entity, updateData)
        console.log("[CLIENT] VideoPlayer state synchronized from server")
      }
    })
  }

  /**
   * Save current state to storage (server-only)
   */
  private async saveStateToStorage() {
    if (!this.lastValidState) return
    
    try {
      const stateJson = JSON.stringify(this.lastValidState)
      await Storage.set(this.storageKey, stateJson)
    } catch (error) {
      console.error("[SERVER] Error saving VideoPlayer state to storage:", error)
    }
  }

  /**
   * Update cached admin addresses list (server-only)
   */
  private async updateAdminAddresses() {
    if (!isServer()) return
    if (isPreview()) return
    if (!FLAG_CHECK_ADMIN_ADDRESSES) return
   
    try {
      const [error, response] = await getSceneAdmins()
      if (error) {
        console.error("[SERVER] Error fetching admin list:", error)
        this.adminAddresses = new Set()
        return
      }

      // Cache admin addresses (normalized to lowercase)
      this.adminAddresses = new Set(
        (response ?? []).map(admin => admin.admin.toLowerCase())
      )
      console.log("[SERVER] Updated admin addresses cache:", Array.from(this.adminAddresses))
    } catch (error) {
      console.error("[SERVER] Error updating admin addresses:", error)
      this.adminAddresses = new Set()
    }
  }

  /**
   * Broadcast current state to all clients (server-only)
   */
  private broadcastState() {
    if (!this.lastValidState) return

    const syncData: { src: string; playing: boolean; loop?: boolean } = {
      src: this.lastValidState.src,
      playing: this.lastValidState.playing
    }
    if (this.lastValidState.loop !== undefined) {
      syncData.loop = this.lastValidState.loop
    }

    room.send(MessageType.VIDEO_PLAYER_SYNC, syncData)
  }

  /**
   * Update function - called every frame
   * @param dt - Delta time since last frame (in seconds)
   */
  update(dt: number) {
    // Called every frame
  }
}

