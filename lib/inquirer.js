const inquirer = require('inquirer')
// import prompt from 'inquirer'

module.exports = {
  askCredentials: () => {
    const questions = [
      {
        name: 'username',
        type: 'input',
        default: 'Testuser',
        message: 'Enter your Corelink username:',
        validate(value) {
          if (value.length) {
            return true
          }
          return 'Please enter your username for Holodeck Corelink.'
        },
      },
      {
        name: 'password',
        type: 'password',
        default: 'Testpassword',
        message: 'Enter your password:',
        validate(value) {
          if (value.length) {
            return true
          }
          return 'Please enter your password.'
        },
      },
    ]
    return inquirer.prompt(questions)
  },
}
