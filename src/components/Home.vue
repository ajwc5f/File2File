<template>
  <div class="home">
    <!--<div v-if="!dropboxAccessToken">
      <DropboxAuth v-bind:dropbox_client_id="dropbox_client_id" v-on:dropboxAuthenticated="dropboxAuthenticated"></DropboxAuth>
      <router-link to="/dropboxauth">Dropbox Authentication page</router-link>
    </div>
    <div v-else>
      <p>Authenticated</p>
    </div>-->
    <h1>Home</h1>
    <label for="dropboxFilesList">Dropbox Files</label>
    <select multiple class="form-control" id="dropboxFilesList">
      <option v-for="file in dropbox_files" v-bind:value="file.id">{{file.name}}</option>
    </select>
  </div>
</template>

<script>
import Dropbox from 'dropbox';
//import DropboxAuth from './DropboxAuth';

export default {
  name: 'home',
  components: {
    //DropboxAuth
  },
  data () {
    return {
      //isDropboxAuthenticated: false
      dropbox_client_id: 'xa0607rzubdwd51',
      dropbox_access_token: 'jVKh7pPwvkAAAAAAAAAAXuDLbBvlcoDZDGn4NOHMUkfDnI_peEehAQl8HtM904xh',
      dropbox_files: []
    }
  },
  methods: {
    dropboxAuthenticated: function (auth_token) {
      this.dropbox_access_token = auth_token;
      console.log("here");
    },
    getDropboxFilesList: function () {
      const vm = this;
      var dbx = new Dropbox({ accessToken: vm.dropbox_access_token });
      dbx.filesListFolder({path: ''})
      .then(function(response) {
        console.log(response);
        vm.renderItems(response.entries);
      })
      .catch(function(error) {
        console.error(error);
      });
    },
    renderItems: function (items) {
      const vm = this;
      items.forEach(function(item) {
        vm.dropbox_files.push(item);
      });
    }
  },
  computed: {
  },
  mounted: function () {
    const vm = this;
    vm.getDropboxFilesList();
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h1, h2 {
  font-weight: normal;
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
