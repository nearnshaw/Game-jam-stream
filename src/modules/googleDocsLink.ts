import { engine } from "@dcl/sdk/ecs"
import { getActions, sceneMessageBus } from "./utils"
import { changeShowcasedUser } from "./banner"
import { hidePedestal } from "../effects/pedestal"
import * as utils from '@dcl-sdk/utils'
import { gitHide, gitUpdate } from "./github"
import { descriptionHide } from "./descriptionPanel"
import { descriptionUpdate } from "./descriptionPanel"


// using file https://docs.google.com/spreadsheets/d/1dFvdn0OuTKa8slpCruf-EiNp-LJpG3z6kejsMeYZDDI/edit?gid=495861440#gid=495861440

export var jsonData: any[] = []

export async function downloadScheduleData() {


    const url = 'https://docs.google.com/spreadsheets/d/1dFvdn0OuTKa8slpCruf-EiNp-LJpG3z6kejsMeYZDDI/gviz/tq?tqx=out:json&gid=0&headers=1'
    // //'https://docs.google.com/spreadsheets/d/1pZsS3M-7Gjpir0R-LtMjh0tVcf-ron73fP3h93GTqpU/gviz/tq?tqx=out:json&gid=1429457611'
        //gid=1429457611 refers to the target tab of the g-doc
    const txt = await fetch(url).then((res) => res.text())

    //parsing data into json format
    const r = txt.match(/google\.visualization\.Query\.setResponse\(([\s\S\w]+)\)/i)
    console.log("r: ", r)
    if (r && r.length == 2) {
      const obj = JSON.parse(r[1])
      const table = obj.table
      const header = table.cols.map(({ label }: { label: string }) => label)
      const rows = table.rows.map(({ c }: { c: any }) => c.map((e: any) => e ? (e.v || "") : ""))

      console.log("header: ", header);
      console.log("rows: ", rows);

      jsonData = []
      for (const row of rows) {
        let rowData: { [key: string]: any } = {}
        header.forEach((column: string, i: number) => {
          if (row[i]) {
            rowData[column] = row[i]
          }
        })

        jsonData.push(rowData)
        console.log("rowData: ", JSON.stringify(rowData))
      }
      //console.log("Downloaded schedule data : ", jsonData)
    }
  }

  var scheuldeIndex:number = 0

  export function setupSchedulControllerData(){

    const scheduleController = engine.getEntityOrNullByName("scheduleController")

    if(scheduleController){


        getActions("scheduleController")?.on("Deactivate", () => {


            console.log("scheduleController: ", scheduleController)
          
        })

        getActions("scheduleController")?.on("Next", () => {
            
            scheuldeIndex ++

            console.log("scheduleController: ", scheuldeIndex, JSON.stringify(jsonData[scheuldeIndex]))

            setFeaturedUser(jsonData[scheuldeIndex].name, jsonData[scheuldeIndex].avatarName, jsonData[scheuldeIndex].repo, jsonData[scheuldeIndex].description)
         

        })

        getActions("scheduleController")?.on("Previous", () => {
            
            scheuldeIndex --    

            console.log("scheduleController: ", scheuldeIndex, JSON.stringify(jsonData[scheuldeIndex]))

            setFeaturedUser(jsonData[scheuldeIndex].name, jsonData[scheuldeIndex].avatarName, jsonData[scheuldeIndex].repo, jsonData[scheuldeIndex].description)
         
        })

        getActions("scheduleController")?.on("First", () => {
            
            scheuldeIndex = 0

            console.log("scheduleController: ", scheuldeIndex, JSON.stringify(jsonData[scheuldeIndex]))

            setFeaturedUser(jsonData[scheuldeIndex].name, jsonData[scheuldeIndex].avatarName, jsonData[scheuldeIndex].repo, jsonData[scheuldeIndex].description)
        })

        const scheduleControllerData = jsonData.find((data) => data.name === "Schedule Controller")
        console.log("scheduleControllerData: ", scheduleControllerData)
    }

  }


  export function setFeaturedUser(name:string, avatarName:string, repo?:string, description?:string){


    hidePedestal()
    changeShowcasedUser(name)

    if(repo){
      gitUpdate(repo)
    } else {
      gitHide()
    }

    if(description){
      descriptionUpdate(description)
    } else {
      descriptionHide()
    }

    utils.timers.setTimeout(() => {
      sceneMessageBus.emit("Pedestal", { player: avatarName})
    }, 1050)
    
  }



  export async function sendClapData(name:string, userName:string, clapCount:number){

    const url = `https://maker.ifttt.com/trigger/ClapMeterData/json/with/key/ryQWdJ3ckOFpkFPlUSN_-`

    const formattedRow = name + "|||" + userName + "|||" + clapCount

    const data = {
      filename: "Clap Meter",
      formatted_row: formattedRow
    }

    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(data)
    })
    
    console.log("response: ", response)

  }