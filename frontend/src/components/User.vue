<template>
  <div id="app">
    <div class="text-uppercase text-bold">username selected: {{selected}}</div>
    <table class="table table-striped table-hover">
      <thead>
        <tr>
          <th>
            <label class="form-checkbox">
            <input type="checkbox" v-model="selectAll" @click="select">
            <i class="form-icon"></i>
            </label>
          </th>
          <th>username</th>
          <th>name</th>
          <th>email</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(i) in userList"   :key ="i.username">
          <td>
            <label class="form-checkbox">
                <input type="checkbox" :value="i.username" v-model="selected">
              <i class="form-icon"></i>
            </label>
          <td>{{i.username}}</td>
          <td>{{i.first}}</td>
          <td>{{i.email}}</td>
        </tr>
        <button type="button" class="text-center button btn-xs btn-danger" v-on:click="removeRow()">Remove User</button>
        <button type="button" class="text-center button btn-xs btn-danger" v-on:click=" updateRow()">update User</button>
      </tbody>
    </table>
    <div  class ="update User" v-if="updateFlag" >
      <div class="row">
        <div class="col-sm-8 offset-sm-2">
            <h2>Update User {{user.username}}</h2>
            <form @submit.prevent="handleUpdateUser">
              <div class="form-group">
                <label for="username">username</label>
                <input type="text" v-model="user.username" id="username" name="username" class="form-control" :class="{ 'is-invalid': submitted  && $v.user.username.$error }" />
                <div v-if="submitted && !$v.user.username.required" class="invalid-feedback">User Name is required and should be unique</div>
              </div>
              <div class="form-group">
                <label for="first">First Name</label>
                <input type="text" v-model="user.first" id="first" name="first" class="form-control" :class="{ 'is-invalid': submitted && $v.user.first.$error }" />
                <div v-if="submitted && !$v.user.first.required" class="invalid-feedback">First Name is required</div>
              </div>
              <div class="form-group">
                <label for="last">Last Name</label>
                <input type="text" v-model="user.last" id="last" name="last" class="form-control" :class="{ 'is-invalid': submitted && $v.user.last.$error }" />
                <div v-if="submitted && !$v.user.last.required" class="invalid-feedback">Last Name is required</div>
              </div>
              <div class="form-group">
                <label for="email">Email</label>
                <input type="email" v-model="user.email" id="email" name="email" class="form-control" :class="{ 'is-invalid': submitted && $v.user.email.$error }" />
                <div v-if="submitted && $v.user.email.$error" class="invalid-feedback">
                    <span v-if="!$v.user.email.required">Email is required</span>
                    <span v-if="!$v.user.email.email">Email is invalid</span>
                </div>
              </div>
              <div class="form-group">
                <button class="btn btn-primary">Update</button>
              </div>
            </form>
          </div>
        </div>

    </div>
    <button type="button" class="text-center button btn-xs btn-danger" v-on:click="addFlag= true" v-if="!addFlag && !updateFlag">Add a new User</button>
    <div class = "adduser" v-if="addFlag">
      <div class="row">
          <div class="col-sm-8 offset-sm-2">
              <h2>Add a new User</h2>
              <form @submit.prevent="handleAddUser">
                <div class="form-group">
                    <label for="username">username</label>
                    <input type="text" v-model="user.username" id="username" name="username" class="form-control" :class="{ 'is-invalid': submitted && unique && $v.user.username.$error }" />
                    <div v-if="submitted && !$v.user.username.required" class="invalid-feedback">User Name is required and should be unique</div>
                    <div v-if="unique" class="invalid-feedback">User Name is should be unique</div>
                </div>
                <div class="form-group">
                    <label for="first">First Name</label>
                    <input type="text" v-model="user.first" id="first" name="first" class="form-control" :class="{ 'is-invalid': submitted && $v.user.first.$error }" />
                    <div v-if="submitted && !$v.user.first.required" class="invalid-feedback">First Name is required</div>
                </div>
                <div class="form-group">
                    <label for="last">Last Name</label>
                    <input type="text" v-model="user.last" id="last" name="last" class="form-control" :class="{ 'is-invalid': submitted && $v.user.last.$error }" />
                    <div v-if="submitted && !$v.user.last.required" class="invalid-feedback">Last Name is required</div>
                </div>
                <div class="form-group">
                    <label for="email">Email</label>
                    <input type="email" v-model="user.email" id="email" name="email" class="form-control" :class="{ 'is-invalid': submitted && $v.user.email.$error }" />
                    <div v-if="submitted && $v.user.email.$error" class="invalid-feedback">
                        <span v-if="!$v.user.email.required">Email is required</span>
                        <span v-if="!$v.user.email.email">Email is invalid</span>
                    </div>
                </div>
                <div class="form-group">
                    <label for="password">Password</label>
                    <input type="password" v-model="userPass.password" id="password" name="password" class="form-control" :class="{ 'is-invalid': submitted && $v.userPass.password.$error }" />
                    <div v-if="submitted && $v.userPass.password.$error" class="invalid-feedback">
                        <span v-if="!$v.userPass.password.required">Password is required</span>
                        <span v-if="!$v.userPass.password.minLength">Password must be at least 6 characters</span>
                    </div>
                </div>
                <div class="form-group">
                    <label for="confirmPassword">Confirm Password</label>
                    <input type="password" v-model="userPass.confirmpassword" id="confirmPassword" name="confirmPassword" class="form-control" :class="{ 'is-invalid': submitted && $v.userPass.confirmpassword.$error }" />
                    <div v-if="submitted && $v.userPass.confirmpassword.$error" class="invalid-feedback">
                        <span v-if="!$v.userPass.confirmpassword.required">Confirm Password is required</span>
                        <span v-else-if="!$v.userPass.confirmpassword.sameAsPassword">Passwords must match</span>
                    </div>
                </div>
                <div class="form-group">
                    <button class="btn btn-primary">Register</button>
                </div>
              </form>
          </div>
      </div>
    </div>
  </div>
</template>

<script>
/*global corelink*/
import { required, email } from "vuelidate/lib/validators";

  export default {
    name: 'user-table',
    data:()=> {
      return {
        filterParams: '',
        filterKey: '',
        checkboxes: {},
        userList:[],
        selected: [],
        selectAll: false,
        addFlag : false,
        updateFlag: false,
        submitted: false,
        unique:false,
        userPass:{
          password: "",
          confirmPassword: "",
        },
        user: {
          username:"",
          first: "",
          last: "",
          email: "",
          function :""
        }       
      }
    },
    validations: {
       
        user: {
            first: { required },
            last: { required },
            email: { required, email },
            username: { required },
        },
    },
    methods: {
      clearUser:function() {
        this.user.username=""
        this.user.first= ""
        this.user.last= ""
        this.user.email= ""
        this.userPass.password= ""
        this.userPass.confirmpassword=""
        this.user.function =""
        this.submitted= false

      },
      users: function() {
        const option = {}
            option.function= "listUsers"
        corelink.generic(option).then(response=> {
           this.userList = response.userList
           console.log("response",response)
         })
         .catch((e) => { console.log(e); return   })
        return this.userList
      },
      select: function() {
        this.selected = [];
        if (!this.selectAll) {
          for (let i in this.userList) {
            this.selected.push(this.userList[i].username);
          }
        }
      },
      updateRow:  function() {
        if (this.selected.length >1 ){ 
          alert('please select one user to update')
        }
        else if (this.selected.length ==0 ) alert('please select a user for update')
        else {
            const option ={}
            option.function= "getUser"
            option.username = this.selected[0]
                    corelink.generic(option).then((response)=>{ 
                    const user = response.user
                    this.user.email = user.email
                    this.user.username=user.username
                    this.user.first= user.first
                    this.user.last= user.last
                    this.updateFlag = true
                    this.user.oldUsername = user.username
          });
        }
         this.selected = []      
      },
      removeRow:  function() {
        this.selected.forEach(async (el) => {
        //alert(el);
        const option = {}
        option.function= "rmUser"
        option.username = el
         corelink.generic(option).then(()=>{ 
           this.users()
          });
         })
         this.selected = []      
      },
      handleAddUser: function() {
        this.submitted = true
        this.$v.$touch();
        if (this.$v.$invalid) {
            return;
        }
        this.user.function="addUser"
        let tempUser = this.user
        tempUser.password = this.userPass.password
        const option = JSON.stringify(tempUser)
        
        corelink.generic(option).then(()=>{ 
          this.users()
          this.addFlag = false
          this.clearUser()
          })
          .catch((e)=>{
               if ((e.message.split('(')[1].split(')')[0]) =='11'){
                 this.unique = true
                 this.clearUser()
               }
               else{
                 alert(e.message)
               }
          });
        
      },
      handleUpdateUser: function() {
        this.submitted = true
        this.$v.$touch();
        if (this.$v.$invalid) {
            return;
        }
        this.user.function="setUser"
        const option = JSON.stringify(this.user)
        
        corelink.generic(option).then(()=>{ 
          this.users()
          this.updateFlag = false
          })
          .catch((e)=>{
               if ((e.message.split('(')[1].split(')')[0]) =='11'){
                 this.unique = true
               }
          });
        this.clearUser()
      },
    },
    mounted: function () { 
      this.users()  
    },
  }
</script>


<style scoped>
  body{
    padding: 50px
  }
</style>
