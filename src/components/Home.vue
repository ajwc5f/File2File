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
    <p class="lead">Dropbox and Google Drive file transferring.</p>
    <div v-if="!transferScreen">
      <div class="authArea">
        <button ref="googleAuthButton" class="btn btn-primary" style="display: none;">Authorize Google Drive</button>
        <button ref="googleSignoutButton" class="btn btn-danger" style="display: none;">Sign Out of Google Drive</button>
      </div>
      <h3>Dropbox</h3>
      <h5>Select files below to be transferred.</h5>
      <div id="dropbox_content" v-if="dropbox_files.length != 0">
        <!--<select multiple class="form-control" id="dropboxFilesList">
          <option v-for="file in dropbox_files" v-bind:value="file.id">{{file.name}}</option>
        </select>-->
        <multiselect v-model="dropbox_files_selected" :options="dropbox_files" :multiple="true" :close-on-select="false" :clear-on-select="false" :hide-selected="true" :preserve-search="true" placeholder="Pick Dropbox Files" label="name" track-by="name">
          <template slot="tag" scope="props"><span class="custom__tag selected"><span>{{ props.option.name }}</span><span class="custom__remove" @click="props.remove(props.option)"><i class="fa fa-window-close" aria-hidden="true"></i></span></span></template>
        </multiselect>
        <pre class="language-json"><code>{{ dropbox_files_selected  }}</code></pre>
        <input v-on:click.prevent="handleDropboxToGoogleDriveTransfer" type="submit" class="btn btn-success btn-send" value="Transfer to Google Drive">
      </div>
      <div v-else>
        <pre>No files found...</pre>
      </div>

      <h3>Google Drive</h3>
      <h5>Select files below to be transferred.</h5>
      <!--<pre id="content"></pre>-->
      <div id="google_content" v-if="google_files.length != 0">
        <!--<select multiple class="form-control" id="googleFilesList">
          <option v-for="file in google_files" v-bind:value="file.id">{{file.name}}</option>
        </select>-->
        <multiselect v-model="google_files_selected" :options="google_files" :multiple="true" :close-on-select="false" :clear-on-select="false" :hide-selected="true" :preserve-search="true" placeholder="Pick Google Drive Files" label="name" track-by="name">
          <template slot="tag" scope="props"><span class="custom__tag selected"><span>{{ props.option.name }}</span><span class="custom__remove" @click="props.remove(props.option)"><i class="fa fa-window-close" aria-hidden="true"></i></span></span></template>
        </multiselect>
        <pre class="language-json"><code>{{ google_files_selected  }}</code></pre>
        <input v-on:click.prevent="transferFilesToDropbox" type="submit" class="btn btn-success btn-send" value="Transfer to Dropbox">
      </div>
      <div v-else>
        <pre>No files found...</pre>
      </div>
    </div>
    <div v-else>
      <h3 class="text-success">Transferring Files. Please wait...</h3>
      <div id="results" style="margin-top: 30px"></div>
    </div>
  </div>
</template>

<script>
import Dropbox from 'dropbox';
//import DropboxAuth from './DropboxAuth';
import Multiselect from 'vue-multiselect';

export default {
  name: 'home',
  components: {
    //DropboxAuth
    Multiselect
  },
  data () {
    return {
      //isDropboxAuthenticated: false
      dropbox_client_id: 'xa0607rzubdwd51',
      dropbox_access_token: 'jVKh7pPwvkAAAAAAAAAAXuDLbBvlcoDZDGn4NOHMUkfDnI_peEehAQl8HtM904xh',
      dropbox_files: [],
      dropbox_files_selected: [],
      google_api_key: 'AIzaSyBrRmcI2qfeSRdY1_jASGMoycHkgFb4pJk',
      google_client_id: '440978199699-hs9naleoo51g7e10qpcto3a93c46jcht.apps.googleusercontent.com',
      //Discovery docs and authorization scopes required by the Google Drive API
      google_discovery_docs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
      google_scope: 'https://www.googleapis.com/auth/drive',
      google_files: [],
      google_files_selected: [],
      transferScreen: false
    }
  },
  methods: {
    /**
    * Create new Dropbox instance and list files that are in the root of user's Dropbox.
    */
    getDropboxFilesList: function () {
      const vm = this;
      var dbx = new Dropbox({ accessToken: vm.dropbox_access_token });
      dbx.filesListFolder({path: ''})
      .then(function(response) {
        console.log(response);
        vm.renderDropboxItems(response.entries);
      })
      .catch(function(error) {
        console.error(error);
      });
    },
    /**
    * Add Dropbox items to an object.
    */
    renderDropboxItems: function (items) {
      const vm = this;
      items.forEach(function(item) {
        vm.dropbox_files.push(item);
      });
    },
    /**
    * Load the Google Drive auth2 library and API client library.
    */
    handleGoogleDriveClientLoad: function () {
      // Load the API's client and auth2 modules.
      // Call the init client function after the modules load.
      gapi.load('client:auth2', this.initGoogleDriveClient);
    },
    /**
    * Initialize the Google Drive API client library and set up sign-in state listeners.
    */
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
    /**
    * Update the UI appropriately based on sign-in state. After a sign-in, the
    * Google Drive API is called to display a list of user files.
    */
    updateGoogleDriveSigninStatus: function (isSignedIn) {
      const vm = this;
      if (isSignedIn) {
        vm.$refs.googleAuthButton.style.display = 'none';
        vm.$refs.googleSignoutButton.style.display = 'inline';
        vm.listGoogleDriveFiles();
      } else {
        vm.$refs.googleAuthButton.style.display = 'inline';
        vm.$refs.googleSignoutButton.style.display = 'none';
      }
    },
    /**
    *  Sign the user into Google Drive, on button click.
    */
    handleGoogleDriveAuthClick: function (event) {
      gapi.auth2.getAuthInstance().signIn();
    },
    /**
    *  Sign the user out of Google Drive, on button click.
    */
    handleGoogleDriveSignoutClick: function (event) {
      const vm = this;
      gapi.auth2.getAuthInstance().signOut();
      vm.google_files = [];
    },
    /**
    * Append a pre element to the body containing the given message
    * as its text node. Used to display the results of the Google Drive API call.
    */
    appendPre: function (message) {
      var pre = document.getElementById('content');
      var textContent = document.createTextNode(message + '\n');
      pre.appendChild(textContent);
    },
    /**
    * Display list of user Google Drive files containing file name and ID.
    */
    listGoogleDriveFiles: function () {
      const vm = this;
      gapi.client.drive.files.list({
        'q': "'root' in parents and trashed = false",
        'fields': "nextPageToken, files(id, name)"
      }).then(function(response) {
        //vm.appendPre('Files:');
        var files = response.result.files;
        if (files && files.length > 0) {
          for (var i = 0; i < files.length; i++) {
            var file = files[i];
            //vm.appendPre(file.name + ' (' + file.id + ')');
            vm.google_files.push(file);
          }
        } else {
          //vm.appendPre('No files found.');
        }
      });
    },
    /**
    * Ensure that transfer can occur, and then transfer files.
    */
    handleDropboxToGoogleDriveTransfer: function () {
      const vm = this;
      var num_files = vm.dropbox_files_selected.length;
      if (num_files == 0) {
        console.log("No files selected to transfer.")
        return;
      }
      else {
        vm.transferFilesToGoogleDrive()
      }
    },
    /**
    * Download from Dropbox the files that will be transferred,
    * upload each file to Google Drive, then delete the files from
    * Dropbox.
    */
    transferFilesToGoogleDrive: function () {
      const vm = this;
      console.log("Transferring to Google Drive...");
      var num_files = vm.dropbox_files_selected.length;
      console.log(num_files);
      for (var i = 0; i < num_files; i++) {
        console.log("in for");
        var dbx = new Dropbox({ accessToken: vm.dropbox_access_token });
        const selected_dropbox_file_path = vm.dropbox_files_selected[i].path_display;
        dbx.filesDownload({path: selected_dropbox_file_path})
          .then(function(response) {
            console.log(response);
            var blob = response.fileBlob;

            var boundary = '-------314159265358979323846';
            var delimiter = "\r\n--" + boundary + "\r\n";
            var close_delim = "\r\n--" + boundary + "--";

            var reader = new FileReader();
            reader.readAsBinaryString(blob);
            reader.onload = function (e) {
              var contentType = blob.type || 'application/octet-stream';
              var metadata = {
                'title': response.name,
                'mimeType': contentType,
                "parents": [{"id":"root"}]
              };

              var base64Data = btoa(reader.result);
              var multipartRequestBody =
                delimiter +
                'Content-Type: application/json\r\n\r\n' +
                JSON.stringify(metadata) +
                delimiter +
                'Content-Type: ' + contentType + '\r\n' +
                'Content-Transfer-Encoding: base64\r\n' +
                '\r\n' +
                base64Data +
                close_delim;

              var request = gapi.client.request({
                'path': '/upload/drive/v2/files',
                'method': 'POST',
                'params': {'uploadType': 'multipart'},
                'headers': {
                  'Content-Type': 'multipart/mixed; boundary="' + boundary + '"'
                },
                'body': multipartRequestBody});

              request.then(function(file) {
                console.log("File transferred to Google Drive.")
                console.log(file.result);
                var dbx = new Dropbox({ accessToken: vm.dropbox_access_token });
                dbx.filesDelete({path: selected_dropbox_file_path})
                  .then(function(response) {
                    console.log(response);
                  })
                  .catch(function(error) {
                    console.log(error);
                  });
              })
              .catch(function(error){
                console.log(error);
              });
            };
          })
          .catch(function(error) {
            console.error(error);
          });
      }
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

select {
  height: 150px;
}

.selected {
  background-color: lightgreen;
  margin: 5px;
  padding: 5px;
  border-radius: 5px;
}

i {
  padding-left: 10px;
}

multiselect {
  padding: 20px;
}

</style>
