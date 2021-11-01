<template>
  <div class="home">
    <img alt="Vue logo" src="../assets/Logo.svg">
    <HelloWorld msg="Welcome to Corelink: Real Time Research Networking"/>
    <Corelink/>
  </div>
</template>

<script>
// @ is an alias to /src
import HelloWorld from '@/components/HelloWorld.vue'
import Corelink from '@/components/Corelink.vue'

export default {
  name: 'Home',
  components: {
    HelloWorld,
    Corelink
  }
}
</script>
