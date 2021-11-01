
<template>
<div></div>
</template>

<script>
/*global corelink*/
export default {
  name: 'login',

  method:{
      connection(){
          const token= localStorage.getItem('jwt')
          corelink.connect({ token}, { ControlIP: this.host, ControlPort: parseInt(this.port) })
        .then(()=>{
            console.log('Connected to the server')
        })
        .catch((e) => console.log(e))
         
    },
    mounted: function () { 
         this.connection()
    },
    commuted: function () { 
         this.connection()
    },

  }

  
  
}

</script>


<style scoped>
</style>
