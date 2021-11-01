
<template>
  <div>
  <form  id="loginForm" v-on:submit.prevent="submit" v-if="!loggedIn">
        <div class="row">
            <div class="col-12 form-group">
                <label class="col-form-label col-form-label-lg">Username<span class="text-danger">*</span></label>
                <input type="text" v-model.trim="$v.username.$model" :class="{'is-invalid': validationStatus($v.username)}" class="form-control form-control-lg">
                <div v-if=" !$v.username.required && $v.username" class="invalid-feedback">The Username field is required.</div>
            </div>
            <div class="col-12 form-group">
                <label class="col-form-label col-form-label-lg">Password <span class="text-danger">*</span></label>
                <input type="password" v-model.trim="$v.password.$model" :class="{'is-invalid': validationStatus($v.password)}" class="form-control form-control-lg">
                <div v-if="!$v.password.required" class="invalid-feedback">The password field is required.</div>     
            </div>
            <div class="col-12 form-group">
                <label class="col-form-label col-form-label-lg">host <span class="text-danger">*</span></label>
                <select v-model.trim="$v.host.$model" :class="{'is-invalid': validationStatus($v.host)}" class="form-control form-control-lg">
                    <option value="">Select host</option>
                    <option :value="c" :key="c" v-for="c in hostList">{{ c }}</option>
                </select>
                <div v-if="!$v.host.required" class="invalid-feedback">The host field is required.</div>
            </div>
            <div class="col-12 form-group">
                <label class="col-form-label col-form-label-lg">port <span class="text-danger">*</span></label>
                <select v-model.trim="$v.port.$model" :class="{'is-invalid': validationStatus($v.port)}" class="form-control form-control-lg">
                    <option value="">Select port</option>
                    <option :value="c" :key="c" v-for="c in portList">{{ c }}</option>
                </select>
                <div v-if="!$v.port.required" class="invalid-feedback">The port field is required.</div>
            </div>
            
            <div class="col-12 form-group text-center">
                <button class="btn btn-vue btn-lg col-4">Login</button>
            </div>
        </div>
    </form>
    <div id = 'loggedIn' v-if="loggedIn" >
    <h2> voila logged in</h2>

    <router-link to="/dashboard"><button class="btn btn-vue btn-lg col-4">Dashboard</button></router-link> 
    <router-link to="/log"><button class="btn btn-vue btn-lg col-4">Logs</button></router-link> 
    </div>
  </div>

</template>

<script>
/*global corelink*/
import { required } from 'vuelidate/lib/validators'

export default{
    name: 'Corelink',
    data:()=> {
    return {
        username: '',
        password: '',
        port:'',
        host:'',
        hostList:['127.0.0.1','corelink.hpc.nyu.edu'],
        portList:['20012'],
        loggedIn :false
    }
  },
  validations: {
        username: {required},
        port: {required},
        host: {required},
        password: {required}
    }, 

  methods: {
    connection(){

      corelink.connect({ username: this.username, password: this.password }, { ControlIP: this.host, ControlPort: parseInt(this.port) })
        .then((res)=>{
          if(res && document.querySelector("#loginForm"))
          {
            this.$session.start()
            this.$session.set('jwt', res)
            localStorage.setItem('jwt', res)
            localStorage.setItem('host', this.host)
            localStorage.setItem('port', this.port)
            const data= localStorage.getItem('jwt')
            alert(data)
            console.log(data)
            this.loggedIn = true
          }
        })
        .catch((e) => console.log(e))
    },
    logout: function () {
      this.$session.destroy()
      },
      
    validationStatus: function(validation) {
            return typeof validation != "undefined" ? validation.$error : false;
    },
    submit: function() {
            if (this.$v.$invalid || this.$v.$error) {
              console.log(this.$v)
        return false;
      } 
            this.$v.$touch();
            console.log(this.$v)
            if (this.$v.$pendding || this.$v.$error) return;
            this.connection();
            
            return 
            
        }
  },

  mounted: function () { 
       if (this.$session.exists()) {
         this.$session.destroy()
      this.loggedIn = true
    }
    },
}
  
  

  </script>
  <style>
  .btn-vue{
    background: #53B985;
    color: #31485D;
    font-weight: bold;
  }

  </style>
  
