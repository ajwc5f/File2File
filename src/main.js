// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import VueRouter from 'vue-router'
import Vuex from 'vuex'
import App from './App'
import Home from './components/Home'

Vue.use(VueRouter);
Vue.use(Vuex);

Vue.config.productionTip = false

const routes = [
  { name: 'home',
    path: '/',
    component: Home
  }
]

const router = new VueRouter ({
  routes,
  mode: 'history'
})

/* eslint-disable no-new */
new Vue({
  el: '#app',
  router,
  template: '<App/>',
  components: { App }
})
