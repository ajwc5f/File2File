// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import VueRouter from 'vue-router'
import Vuex from 'vuex'
import App from './App'
import Home from './components/Home'
import DropboxAuth from './components/DropboxAuth'

Vue.use(VueRouter);
Vue.use(Vuex);

Vue.config.productionTip = false

const routes = [
  { name: 'home',
    path: '/',
    component: Home
  },
  {
    name: 'dropboxauth',
    path: '/dropboxauth',
    component: DropboxAuth
  }
]

const router = new VueRouter ({
  routes,
  mode: 'history'
})

const store = new Vuex.Store({
  state: {
    dropbox_access_token: ''
  },
  mutations: {
  	setAccessToken (state, token) {
      state.dropbox_access_token = token;
    }
  }
})

/* eslint-disable no-new */
new Vue({
  el: '#app',
  router,
  store,
  template: '<App/>',
  components: { App }
})
