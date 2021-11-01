/* eslint-disable no-restricted-syntax */
/* eslint-disable guard-for-in */
// V1.0.0.0

const fs = require('fs')
const config = require('../../config/configure')
const inquirer = require('./lib/inquirer')
const corelink = require('../../clients/javascript/corelink.lib')

corelink.debug = false
let functions = null

const getData = async () => {
  const credentials = await inquirer.askCredentials().catch((e) => console.log(e))
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
  return ''
}

async function createTable(final) {
  console.log(final)
  let result = 'Server Initiated Control Functions\n==================================\n'

  // headers
  let reqHeaders = `\n##### Request:\n\n| ${'arguments'.padEnd(19, ' ')}| ${'description'.padEnd(84, ' ')}| type  | sample                | default   |\n`
  reqHeaders += '|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:----------|\n'
  // eslint-disable-next-line max-len
  // let resHeaders = `\n##### Response:\n\n| ${'responses'.padEnd(19, ' ')}| ${'description'.padEnd(84, ' ')}| type  | sample                | optional |\n`
  // eslint-disable-next-line max-len
  // resHeaders += '|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:--------:|\n'

  for (const key in final) { // go through the array of functions
    let requestContents = ''
    // eslint-disable-next-line no-unused-vars
    let responseContents = ''
    let info = '' // for name and decsciption of each function

    const func = final[key] // each func is the json block of a function

    // console.log("func:")
    // console.log(func)     //this is empty
    for (const k1 in func) { // go through each field in the function
      // console.log("k1:")
      // console.log(k1) // name of parameter //returns 0
      // console.log("func: k1")
      // console.log(func[k1]) // value of parameter //returnns no value


      // create name header
      if (k1 === 'name') {
        info += `\n${func[k1]}\n`
        info += `${'-'.padEnd(func[k1].length, '-')}\n`
      }
      // create description header
      if (k1 === 'description') {
        info += `\n${func[k1]}\n`
      }
      // create arguments table
      if (k1 === 'arguments') {
        for (const nestedkey in func[k1]) {
          const arg = ((func[k1])[nestedkey])
          if (typeof arg.default === 'undefined') arg.default = ' '
          if (typeof arg.sample === 'undefined') arg.sample = ' '
          arg.default = arg.default.toString()
          arg.sample = arg.sample.toString()
          requestContents += `|${nestedkey.padEnd(20, ' ')}|${arg.description.padEnd(85, ' ')}|${arg.type.padEnd(7, ' ')}|${arg.sample.padEnd(23, ' ')}|${arg.default.padEnd(11, ' ')}|\n`
        }
      }
      // create response table
      if (k1 === 'responses') {
        for (const nestedkey in func[k1]) {
          const resp = ((func[k1])[nestedkey])
          if (typeof resp.optional === 'undefined') resp.optional = 'false'
          if (typeof resp.sample === 'undefined') resp.sample = ' '
          resp.optional = resp.optional.toString()
          resp.sample = resp.sample.toString()
          responseContents += `|${nestedkey.padEnd(20, ' ')}|${resp.description.padEnd(85, ' ')}|${resp.type.padEnd(7, ' ')}|${resp.sample.padEnd(23, ' ')}| ${resp.optional.padEnd(9, ' ')}|\n`
        }
      }

      delete func.version // ignoring function version
      delete func.author // ignoring function author
      delete func.email // ignoring email
      delete func.doc_href // ignoring doc_href
      // break; // only do one function's output
    }

    // console.log(info)

    // requestContents = `<tbody>${requestContents}</tbody>`
    // responseContents = `<tbody>${responseContents}</tbody>`

    const tabreq = `${reqHeaders}${requestContents}`
    const tabresp = '' // `${resHeaders}${responseContents}\n`

    const output1 = tabreq.concat(tabresp)
    const output2 = info.concat(output1)
    result = result.concat(output2)
  }
  // console.log(result)
  return result
}

async function run() {
  const final = await getData()
  console.log('final')
  // console.log(final)  //returns correct output


  const str = await createTable(final)
  console.log('Table:') // gets only headers
  console.log(str) // gets only headers


  // write output to md file
  fs.writeFileSync('../../documentation/Corelink_Server_Initiated_Functions.md.md', str, (err) => {
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
