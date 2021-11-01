# vue-app

## Project setup
```
npm install
```

### Compiles and hot-reloads for development

```
npm run serve
```
Then connect to https://127.0.0.1:8080/
Login to server with Testuser / Testpassword

### Compiles and minifies for production
```
npm run build
```



### Lints and fixes files
```
npm run lint
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).


Initial understanding of the architecture of the vue APP:

1. Router:

The router is the route definition in the vue application and it help the whole application to be routed to different pages and loaded:

    1. For home(main page) : /
    2. For logs( logs for the corelink ) :/log
    3. For dashboard( admin dashboard for doing all the intergovernmental works)  :/dashboard
2. All the component either views of component have a set pattern for the file:
   1. Template : how the component will look on the browser
   1. Script: what all it will perform ( javascript functions):
      1. Everything under export default that needs for the template to render 
      1. Under mount hooks: it will rendered only when the component is mounted
   1. Style ; it's the styling of the component , should be keep under ```<style scoped>``` , otherwise it might impact the whole vue app styling

The main start of the vue is app.vue.

From there you will call our component from the app.vue,

The architecture used by the corelink vue App is that the components that are performing major functions, and the components that are viewing are under view folder.


Corelink bowser client is globally imported, and can be used any component.
