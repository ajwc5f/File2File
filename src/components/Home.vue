<template>
  <div class="home">
    <!--<div v-if="!dropboxAccessToken">
      <DropboxAuth v-bind:dropbox_client_id="dropbox_client_id" v-on:dropboxAuthenticated="dropboxAuthenticated"></DropboxAuth>
      <router-link to="/dropboxauth">Dropbox Authentication page</router-link>
    </div>
    <div v-else>
      <p>Authenticated</p>
    </div>-->
    <h1>File2File</h1>
    <p class="lead">Dropbox and Google Drive file transfering.</p>
    <h3>Dropbox</h3>
    <select multiple class="form-control" id="dropboxFilesList">
      <option v-for="file in dropbox_files" v-bind:value="file.id">{{file.name}}</option>
    </select>

    <h3>Google Drive</h3>
    <button ref="googleAuthButton" style="display: none;">Authorize</button>
    <button ref="googleSignoutButton" style="display: none;">Sign Out</button>

    <pre id="content"></pre>

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
      dropbox_files: [],
      google_api_key: 'AIzaSyBrRmcI2qfeSRdY1_jASGMoycHkgFb4pJk',
      google_client_id: '440978199699-hs9naleoo51g7e10qpcto3a93c46jcht.apps.googleusercontent.com',
      google_discovery_docs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
      google_scope: 'https://www.googleapis.com/auth/drive.metadata.readonly',
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
    },
    handleGoogleDriveClientLoad: function () {
      // Load the API's client and auth2 modules.
      // Call the init client function after the modules load.
      gapi.load('client:auth2', this.initGoogleDriveClient);
    },
    initGoogleDriveClient: function () {
      const vm = this;
      gapi.client.init({
        apiKey: vm.google_api_key,
        clientId: vm.google_client_id,
        discoveryDocs: vm.google_discovery_docs,
        scope: vm.google_scope
      }).then(function () {
        // Listen for sign-in state changes.
        gapi.auth2.getAuthInstance().isSignedIn.listen(vm.updateGoogleDriveSigninStatus);

        // Handle the initial sign-in state.
        vm.updateGoogleDriveSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
        vm.$refs.googleAuthButton.onclick = vm.handleGoogleDriveAuthClick;
        vm.$refs.googleSignoutButton.onclick = vm.handleGoogleDriveSignoutClick;
      });
    },
    updateGoogleDriveSigninStatus: function (isSignedIn) {
      const vm = this;
      if (isSignedIn) {
        vm.$refs.googleAuthButton.style.display = 'none';
        vm.$refs.googleSignoutButton.style.display = 'block';
        vm.listFiles();
      } else {
        vm.$refs.googleAuthButton.style.display = 'block';
        vm.$refs.googleSignoutButton.style.display = 'none';
      }
    },
    handleGoogleDriveAuthClick: function (event) {
      gapi.auth2.getAuthInstance().signIn();
    },
    handleGoogleDriveSignoutClick: function (event) {
      const vm = this;
      gapi.auth2.getAuthInstance().signOut();
      $('#content').empty();
    },
    appendPre: function (message) {
      var pre = document.getElementById('content');
      var textContent = document.createTextNode(message + '\n');
      pre.appendChild(textContent);
    },
    listFiles: function () {
      const vm = this;
      gapi.client.drive.files.list({
        'fields': "nextPageToken, files(id, name)"
      }).then(function(response) {
        vm.appendPre('Files:');
        var files = response.result.files;
        if (files && files.length > 0) {
          for (var i = 0; i < files.length; i++) {
            var file = files[i];
            vm.appendPre(file.name + ' (' + file.id + ')');
          }
        } else {
          vm.appendPre('No files found.');
        }
      });
    }
  },
  computed: {
  },
  mounted: function () {
    const vm = this
    vm.getDropboxFilesList();
    vm.handleGoogleDriveClientLoad();
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
