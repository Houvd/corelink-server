/* eslint-disable no-restricted-syntax */
/* eslint-disable guard-for-in */
// V1.0.0.0

const config = {
    ControlPort: 20012,
    ControlIP: '127.0.0.1',
    autoReconnect: false,
    cert: '../config/ca-crt.pem'
  }
  
  const fs = require('fs')
  const corelink = require('../../javascript/corelink.lib.js')
  // above path relative to corelink JS client installed in the pipeline.
  
  const username = 'Testuser'
  const password = 'Testpassword'
  
  corelink.debug = false
  let functions = null
  
  const getData = async () => {
    const  final=[]
    const credentials = { username, password }
    if (
      await corelink.connect(credentials, config).catch((e) => console.log(e))
    ) {
      console.log('-----------')
      functions = await corelink.listServerFunctions().catch((e) => console.log(e))
      functions = functions.functionList
      let i
      const description = []
      for (i = 0; i < functions.length; i += 1) {
        // console.log(functions[i])
  
        // eslint-disable-next-line no-await-in-loop
        description[functions[i]] = await corelink
          .describeServerFunction({ functionName: functions[i] })
          .catch((e) => console.log(e))
        description[functions[i]] = description[functions[i]].description
      }
      const final = []
  
      for (const key in description) {
        const func = description[key]
        delete func.version // ignoring function version
        delete func.author // ignoring function author
        delete func.email // ignoring email
        delete func.doc_href // ignoring doc_href
        final.push(func)
      }
  
  
      return final
    }
  }

async function createTable(final) {
    console.log(final)
    let bootstrap = '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.3.1/dist/css/bootstrap.min.css" integrity="sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T" crossorigin="anonymous">'
    let css = '<style type="text/css">td {word-break: break-all;}</style>'
    let result = '<html><head>' + bootstrap + css + '</head><body style="margin: 2.5%"><h1 style="color:rgba(0, 0, 0, 0.911)";font-family:serif> Server Initiated Control Functions</h1>\n'
  
    // headers
    const reqHeaders = '<thead class="thead-light"><tr><th scope="col">argument</th><th scope="col">description</th><th scope="col">type</th><th scope="col">sample</th><th scope="col"> default</th> </tr></thead>'
    const resHeaders = '<thead class="thead-light"><tr><th>responses</th><th>description</th><th>type</th><th>sample</th><th> optional</th> </tr></thead>'
    // const tablecss = '<header><style>table, th, td {padding: 15px;text-align: left; border:solid rgb(159,159,159);border-collapse: collapse;color:black}</style></header>'
    const tablecss = ''
  
    // go through the array of functions
    for (const key in final) {
      if (key) {
        let requestContents = ''
        let responseContents = ''
        let info = '' // for name and decsciption of each function
  
        const func = final[key] // each func is the json block of a function
  
        // console.log("func:")
        // console.log(func)     //this is empty
  
        // go through each field in the function
        for (const k1 in func) {
          // create name header
          if (k1) {
            if (k1 === 'name') {
              // eslint-disable-next-line no-useless-concat
              info += `<h4 style="color:rgba(0, 0, 0, 0.911)";font-family:serif> Name:${func[k1]}</h4>\n`
      }
            // create description header
            if (k1 === 'description') {
              // eslint-disable-next-line no-useless-concat
              info
          += `${'<h4 style="color:rgba(70, 70, 70, 0.911)";font-family:serif>'
          + 'Description:'}${
            func[k1]
          }</h4>`
          + '\n'
      }
            // create arguments table
            if (k1 === 'arguments') {
              for (const nestedkey in func[k1]) {
                // go through the array of functions ; loop=0 nestedkey=function
                if (nestedkey) {
                  const arg = ((func[k1])[nestedkey])
                  requestContents
            += `${'<tr class="active">'
            + ' <td>'}${
              nestedkey
            }</td> <td>${
              arg.description
            }</td> <td>${
              arg.type
            }</td> <td>${
              arg.sample
            }</td><td>${
              arg.default
            }</td></tr>`}
              }
            }
            // create response table
            if (k1 === 'responses') {
              for (const nestedkey in func[k1]) {
                // go through the array of functions ; loop=0 nestedkey=function
                if (nestedkey) {
                  const resp = ((func[k1])[nestedkey])
  
                  responseContents
            += `${'<tr class="active">'
            + ' <td>'}${
              nestedkey
            }</td> <td>${
              resp.description
            }</td> <td>${
              resp.type
            }</td> <td>${
              resp.sample
            }</td><td>${
              resp.optional
            }</td></tr>`}
              }
            }
  
            delete func.version // ignoring function version
            delete func.author // ignoring function author
            delete func.email // ignoring email
            delete func.doc_href // ignoring doc_href
            // break; // only do one function's output
          }
        }
  
        // console.log(info)
  
        requestContents = `<tbody>${requestContents}</tbody>`
        responseContents = `<tbody>${responseContents}</tbody>`
  
        const tabreq = `${tablecss
        }<table class="table table-bordered" style="margin: auto">${reqHeaders} ${requestContents} </table> <br>`
        const tabresp = `${tablecss
        }<table class="table table-bordered" style="margin: auto"> ${resHeaders} ${responseContents} </table><br>`
    
        // const output1 = tabreq.concat(tabresp)
        const output1 = tabreq
        const output2 = info.concat(output1)
        result = result.concat(output2)
      }
    }
  
    result += '</html>'
    // console.log(result)
    return result
  }
  
  

async function run() {
    const final = await getData()
    // console.log('final')
    // console.log(final)  //returns correct output
  
  
    const str = await createTable(final)
    // console.log('Table:') // gets only headers
    // console.log(str) // gets only headers
  
  
    // write output to md file
    fs.writeFileSync('../../Corelink_Server_Initiated_Functions.html', str, (err) => {
      if (err) {
        console.log(err)
      }
      console.log('your file has been created!')
    })
  
    // disconnecting
    // await corelink.disconnect()
    process.exit()
  }
  run()