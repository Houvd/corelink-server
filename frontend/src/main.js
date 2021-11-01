import Vue from 'vue'
import App from './App.vue'
import LoadScript from 'vue-plugin-load-script';
import Vuelidate from 'vuelidate'
import VueCookies from 'vue-cookies'
import VueRouter from 'vue-router'
import router from './router'
import VueSession from 'vue-session'
Vue.use(VueSession)
Vue.use(VueCookies)
Vue.use(LoadScript)
Vue.use(Vuelidate)
Vue.use(VueRouter)
Vue.config.productionTip = false



new Vue({
  router,
  render: h => h(App)
}).$mount('#app')
