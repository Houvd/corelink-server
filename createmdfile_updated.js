
/* eslint-disable no-restricted-syntax */
/* eslint-disable guard-for-in */
// V1.0.0.0

const config = {
  ControlPort: 20012,
  ControlIP: '127.0.0.1',
  autoReconnect: false,
  cert: './ca-crt.pem'
}

const fs = require('fs')
const corelink = require('./corelink.lib')

const username = 'Testuser'
const password = 'Testpassword'

corelink.debug = false
let functions = null

// eslint-disable-next-line consistent-return
const getData = async () => {
  const final=[]
  const credentials = { username, password }
  if (
    await corelink.connect(credentials, config).catch((err) => {
      console.Error(err)
    })
  ) {
    console.log('-----------')
    functions = await corelink.listFunctions().catch((err) => {
      console.Error(err)
    })
    let i
    
    functions = functions.functionList
    // console.log("functions",functions)
    const description = []
    for (i = 0; i < functions.length; i += 1) {
      // console.log(functions[i])

      // eslint-disable-next-line no-await-in-loop
      description[functions[i]] = await corelink
        .describeFunction({ functionName: functions[i] })
        .catch((err) => {
          console.Error(err)
        })
	//console.log(description)
    }
    for (const key in description) {
      const func = description[key]
      //console.log(func)
      delete func.description.version // ignoring function version
      delete func.description.author // ignoring function author
      delete func.description.email // ignoring email
      delete func.description.doc_href // ignoring doc_href
      //console.log(func)
	//console.log("--------")
      final.push(func)
    }

    return final
  }
}

async function createTable(final) {
  // console.log(final)
  let result = ''

  // headers
  const reqHeaders = '<thead><tr><th>argument</th><th>description</th><th>type</th><th>sample</th><th> default</th> </tr></thead>'
  const resHeaders = '<thead><tr><th>responses</th><th>description</th><th>type</th><th>sample</th><th> optional</th> </tr></thead>'
  const tablecss = '<html><header><style>table, th, td {padding: 15px;text-align: left; border:solid rgb(141, 28, 28);border-collapse: collapse;color:black}</style></header>'

  for (const key in final) {
    // go through the array of functions
    let requestContents = ''
    let responseContents = ''
    let info = '' // for name and decsciption of each function

    const func = final[key].description // each func is the json block of a function

    // console.log("func:")
    // console.log(func)     //this is empty
    for (const k1 in func) {
      // go through each field in the function

      // console.log("k1:")
      // console.log(k1) // name of parameter //returns 0
      // console.log("func: k1")
      // console.log(func[k1]) // value of parameter //returnns no value

      // create name header
      if (k1 === 'name') {
        info += `<h4 style="color:rgba(0, 133, 185, 0.911)";"font-family:verdana> Name:${func[k1]}</h4>\n`
      }
      // create description header
      if (k1 === 'description') {
        info
          += `${'<h4 style="color:rgba(0, 133, 185, 0.911)";"font-family:verdana>'
          + 'Description:'}${
            func[k1]
          }<h4>`
          + '\n'
      }
      // create arguments table
      if (k1 === 'arguments') {
        for (const nestedkey in func[k1]) {
          // go through the array of functions ; loop=0 nestedkey=function
          const arg = func[k1][nestedkey]

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
            }</td></tr>`
        }
      }
      // create response table
      if (k1 === 'responses') {
        for (const nestedkey in func[k1]) {
          // go through the array of functions ; loop=0 nestedkey=function

          const resp = func[k1][nestedkey]

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
            }</td></tr>`
        }
      }

      delete func.version // ignoring function version
      delete func.author // ignoring function author
      delete func.email // ignoring email
      delete func.doc_href // ignoring doc_href
      // break; // only do one function's output
    }

    //console.log(info)

    requestContents = `<tbody>${requestContents}</tbody>`
    responseContents = `<tbody>${responseContents}</tbody>`

    const tabreq = `${tablecss
    }<table class="table">${reqHeaders} ${requestContents} </table> </br>`
    const tabresp = `${tablecss
    }<table class="table"> ${resHeaders} ${responseContents} </table></br>`

    const output1 = tabreq.concat(tabresp)
    const output2 = info.concat(output1)
    result = result.concat(output2)
  }

  result += '</html>'
  // console.log(result)
  return result
}

async function run() {
  const final = await getData()
  console.log('final')
  // console.log(final)  //returns correct output

  const str = await createTable(final)
  //console.log('Table:') // gets only headers
 //console.log(str) // gets only headers

  // write output to md file
  fs.writeFileSync('./Corelink_Server_Initiated_Functions.html', str, (err) => {
    if (err) {
      console.log(err)
    }
    console.log('your file has been created!')
  })

  // disconnecting
  // await corelink.disconnect()
  // process.exit()

  // console.log(str)
  process.exit()
}
run()
