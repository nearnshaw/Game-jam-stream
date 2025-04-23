export async function downloadScheduleData() {


    const url = 'https://docs.google.com/spreadsheets/d/1dFvdn0OuTKa8slpCruf-EiNp-LJpG3z6kejsMeYZDDI/gviz/tq?tqx=out:json&gid=0'
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

      // console.log("header: ", header);
      //console.log("rows: ", rows);

      let jsonData = []
      for (const row of rows) {
        let rowData: { [key: string]: any } = {}
        header.forEach((column: string, i: number) => {
          if (row[i]) {
            rowData[column] = row[i]
          }
        })

        jsonData.push(rowData)
        console.log("rowData: ", rowData)
      }
      console.log("Downloaded schedule data : ", jsonData)
    }
  }