<template>
  <div class="hello">
    <span style="white-space: pre-line">{{msg}}</span>
    
  </div>
</template>

<script>
/*global corelink*/
export default {
  name: 'logs',
  data:()=> {
    return {    
    msg: String
    }
  },

  mounted :function reciever() {
      // Setup
    const workspace = 'Log'
    const protocol = 'ws'
    const datatype = ['LogStream']
      corelink.createReceiver({
      workspace, protocol, type: datatype, echo: false, alert: false,
    }).then(()=>{this.msg ='Log stream is connected \n'})   
    .catch((err) => { console.log(err) })
    corelink.on('receiver', (e) => console.log('receiver callback', e))
    corelink.on('sender', (e) => console.log('sender callback', e))
    corelink.on('stale', (e) => console.log('stale callback', e))
    corelink.on('dropped', (e) => console.log('dropped callback', e))
      
  },
  watch :{ msg:function () {
    
    
    corelink.on('data', (streamid, data, timestamp) => {
    data = String.fromCharCode.apply(null, new Uint8Array(data))    
    const data1 = `${timestamp}      ${data}`
    this.msg = this.msg +'\n' + data1
  })}
  },
  
}
</script>


<style scoped>
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
</style>
