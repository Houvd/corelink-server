/* eslint-disable no-useless-concat */
/* eslint-disable no-restricted-syntax */
// V1.0.0.0

const fs = require('fs')
const config = require('../../config/configure')
const inquirer = require('./lib/inquirer')
const corelink = require('../../clients/javascript/corelink.lib')

corelink.debug = false
let functions = null

// eslint-disable-next-line consistent-return
const getData = async () => {
  const credentials = await inquirer.askCredentials().catch((err) => {
    console.Error(err)
  })
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
    const description = []
    for (i = 0; i < functions.length; i += 1) {
      // console.log(functions[i])

      // eslint-disable-next-line no-await-in-loop
      description[functions[i]] = await corelink
        .describeFunction({ functionName: functions[i] })
        .catch((err) => {
          console.Error(err)
        })
    }
    const final = []

    // eslint-disable-next-line no-restricted-syntax
    for (const key in description) {
      if (key) {
        const func = description[key]
        delete func.version // ignoring function version
        delete func.author // ignoring function author
        delete func.email // ignoring email
        delete func.doc_href // ignoring doc_href
        final.push(func)
      }
    }


    return final
  }
}

function createTable(final) {
  console.log(final)
  let result = ''

  // headers
  const reqHeaders = '<thead><tr><th>argument</th><th>description</th><th>type</th><th>sample</th><th> default</th> </tr></thead>'
  const resHeaders = '<thead><tr><th>responses</th><th>description</th><th>type</th><th>sample</th><th> optional</th> </tr></thead>'
  const tablecss = '<html><header><style>table, th, td { border: solid blue; }</style></header>'
  const styleheader = '<html><header><style>color: black;font-size: 46px; </style></header>'

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
            info += `${styleheader}<h4>` + `Name:${func[k1]}</h4>` + '\n'
          }
          // create description header
          if (k1 === 'description') {
            // eslint-disable-next-line no-useless-concat
            info += `${'<h4>' + 'Description:'}${func[k1]}<h4>` + '\n'
          }
          // create arguments table
          if (k1 === 'arguments') {
            for (const nestedkey in func[k1]) {
              // go through the array of functions ; loop=0 nestedkey=function
              if (nestedkey) {
                const arg = ((func[k1])[nestedkey])
                requestContents += `${'<tr class="active">' + ' <td>'}${nestedkey}</td> <td>${arg.description}</td> <td>${arg.type}</td> <td>${arg.sample}</td><td>${arg.default}</td></tr>`
              }
            }
          }
          // create response table
          if (k1 === 'responses') {
            for (const nestedkey in func[k1]) {
              // go through the array of functions ; loop=0 nestedkey=function
              if (nestedkey) {
                const resp = ((func[k1])[nestedkey])

                responseContents += `${'<tr class="active">' + ' <td>'}${nestedkey}</td> <td>${resp.description}</td> <td>${resp.type}</td> <td>${resp.sample}</td><td>${resp.optional}</td></tr>`
              }
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

      const tabreq = `${tablecss}<table class="table">${reqHeaders} ${requestContents} </table> </br>`
      const tabresp = `${tablecss}<table class="table"> ${resHeaders} ${responseContents} </table></br>`


      const output1 = tabreq.concat(tabresp)
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
  console.log('final')
  // console.log(final)  //returns correct output


  const str = createTable(final)
  console.log('Table:') // gets only headers
  console.log(str) // gets only headers


  // write output to md file
  fs.writeFile('testdisplay.html', str, (err) => {
    if (err) {
      console.log(err)
    }
    console.log('your file has been created!')
  })
  fs.close()

  // disconnecting
  // await corelink.disconnect()
  // process.exit()

  // console.log(str)
  process.exit()
}
run()
