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
      <div class="authArea">
        <button ref="googleAuthButton" class="btn btn-primary" style="display: none;">Authorize Google Drive</button>
        <button ref="googleSignoutButton" class="btn btn-danger" style="display: none;">Sign Out of Google Drive</button>

        <div id="pre-auth-section" style="display: none;" class="btn btn-primary"><a href="" id="authlink">Authenticate Dropbox</a></div>
        <button id="authed-section" style="display: none;" class="btn btn-danger" v-on:click="signoutDropbox">Sign Out of Dropbox</button>
      </div>
      <div v-if="!transferScreen">
      <h5 class="text-danger">{{ feedback }}</h5>
      <h3>Dropbox</h3>
      <div id="dropbox_content" v-if="dropbox_files.length != 0">
        <multiselect v-model="dropbox_files_selected" :options="dropbox_files" :multiple="true" :close-on-select="false" :clear-on-select="false" :hide-selected="true" :preserve-search="true" placeholder="Pick Dropbox Files to Transfer to Google Drive" label="name" track-by="name">
          <template slot="tag" scope="props"><span class="custom__tag selected"><span>{{ props.option.name }} -- {{ Math.ceil(props.option.size / 1000000) }} MB -- {{ props.option[".tag"] }}</span><span class="custom__remove" @click="props.remove(props.option)"><i class="fa fa-window-close" aria-hidden="true"></i></span></span></template>
        </multiselect>
        <!--<pre class="language-json"><code>{{ dropbox_files_selected  }}</code></pre>-->
        <input v-on:click.prevent="handleDropboxToGoogleDriveTransfer" type="submit" class="btn btn-success btn-send" value="Transfer to Google Drive">
      </div>
      <div v-else>
        <pre>No files found...</pre>
      </div>

      <h3>Google Drive</h3>
      <div id="google_content" v-if="google_files.length != 0">
        <multiselect v-model="google_files_selected" :options="google_files" :multiple="true" :close-on-select="false" :clear-on-select="false" :hide-selected="true" :preserve-search="true" placeholder="Pick Google Drive Files to Transfer to Dropbox" label="name" track-by="name">
          <template slot="tag" scope="props"><span class="custom__tag selected"><span>{{ props.option.name }} -- {{ Math.ceil(props.option.size / 1000000) }} MB</span><span class="custom__remove" @click="props.remove(props.option)"><i class="fa fa-window-close" aria-hidden="true"></i></span></span></template>
        </multiselect>
        <!--<pre class="language-json"><code>{{ google_files_selected  }}</code></pre>-->
        <input v-on:click.prevent="handleGoogleDriveToDropboxTransfer" type="submit" class="btn btn-success btn-send" value="Transfer to Dropbox">
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
      dropbox_access_token: '',
      dropbox_files: [],
      dropbox_files_selected: [],
      google_api_key: 'AIzaSyBrRmcI2qfeSRdY1_jASGMoycHkgFb4pJk',
      google_client_id: '440978199699-hs9naleoo51g7e10qpcto3a93c46jcht.apps.googleusercontent.com',
      //Discovery docs and authorization scopes required by the Google Drive API
      google_discovery_docs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
      google_scope: 'https://www.googleapis.com/auth/drive',
      google_files: [],
      google_files_selected: [],
      transferScreen: false,
      feedback: ''
    }
  },
  methods: {
    parseQueryString: function(str) {
      var ret = Object.create(null);

      if (typeof str !== 'string') {
        return ret;
      }

      str = str.trim().replace(/^(\?|#|&)/, '');

      if (!str) {
        return ret;
      }

      str.split('&').forEach(function (param) {
        var parts = param.replace(/\+/g, ' ').split('=');
        var key = parts.shift();
        var val = parts.length > 0 ? parts.join('=') : undefined;

        key = decodeURIComponent(key);

        val = val === undefined ? null : decodeURIComponent(val);

        if (ret[key] === undefined) {
          ret[key] = val;
        } else if (Array.isArray(ret[key])) {
          ret[key].push(val);
        } else {
          ret[key] = [ret[key], val];
        }
      });

      return ret;
    },
    // Parses the url and gets the access token if it is in the urls hash
    getAccessTokenFromUrl: function () {
      return this.parseQueryString(window.location.hash).access_token;
    },
    // If the user was just redirected from authenticating, the urls hash will
    // contain the access token.
    isAuthenticated: function () {
      return !!this.getAccessTokenFromUrl();
    },
    // This example keeps both the authenticate and non-authenticated setions
    // in the DOM and uses this function to show/hide the correct section.
    showPageSection: function (elementId) {
      document.getElementById(elementId).style.display = 'inline';
    },
    /**
    * Create new Dropbox instance and list files that are in the root of user's Dropbox.
    */
    getDropboxFilesList: function () {
      const vm = this;
      if (vm.isAuthenticated()) {
        vm.showPageSection('authed-section');
        // Create an instance of Dropbox with the access token and use it to
        // fetch and render the files in the users root directory.
        vm.dropbox_access_token = vm.getAccessTokenFromUrl();

        var dbx = new Dropbox({ accessToken: vm.dropbox_access_token });
        dbx.filesListFolder({path: ''})
        .then(function(response) {
          vm.renderDropboxItems(response.entries);
          //vm.$emit('dropboxAuthenticated', vm.dropbox_access);
          console.log(vm.dropbox_access_token);
        })
        .catch(function(error) {
          console.error(error);
        });
      }
      else {
        vm.showPageSection('pre-auth-section');
        // Set the login anchors href using dbx.getAuthenticationUrl()
        var dbx = new Dropbox({ clientId: vm.dropbox_client_id });
        var authUrl = dbx.getAuthenticationUrl('http://localhost:8080/');
        document.getElementById('authlink').href = authUrl;
      }
    },
    /**
    * Add Dropbox items to an object.
    * PARAMS:
    *   items -> the list of items to be rendered
    */
    renderDropboxItems: function (items) {
      const vm = this;
      vm.dropbox_files = [];
      items.forEach(function(item) {
        vm.dropbox_files.push(item);
      });
    },
    signoutDropbox: function () {
      window.location.replace('http://localhost:8080/');
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
    * PARAMS:
    *   isSignedIn -> boolean of whether or not the user is already signed into Google Drive
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
    * PARAMS:
    *   message -> the message to be appended.
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
      vm.google_files = [];
      console.log("here");
      gapi.client.drive.files.list({
        'q': "'root' in parents and trashed = false",
        'fields': "nextPageToken, files(id, name, mimeType, size)"
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
    * Ensure that transfer can occur, and then transfer files to Google Drive.
    */
    handleDropboxToGoogleDriveTransfer: function () {
      const vm = this;
      var num_files = vm.dropbox_files_selected.length;
      if (num_files == 0) {
        console.log("No files selected to transfer.")
        vm.feedback = 'No files selected to transfer.';
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
      vm.transferScreen = true;
      var num_files = vm.dropbox_files_selected.length;
      var file_counter = 0;

      for (var i = 0; i < num_files; i++) {
        console.log("in for");
        if (vm.dropbox_files_selected[i].size > 75000000) {
          console.log('Files over 75MB cannot be transferred.');
          vm.feedback = 'Files over 75MB cannot currently be transferred.';
          vm.transferScreen = false;
          return;
        }
        if (vm.dropbox_files_selected[i][".tag"] == 'folder') {
          vm.feedback = 'Folders cannot currently be transferred from Dropbox to Google Drive.';
          vm.transferScreen = false;
          return;
        }
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
                    file_counter++;
                    vm.checkTransferComplete(file_counter, num_files, 'google');
                  })
                  .catch(function(error) {
                    console.log(error);
                    vm.feedback = 'There was an error deleting a file from Dropbox.';
                    vm.transferScreen = false;
                    return;
                  });
              })
              .catch(function(error){
                console.log(error);
                vm.feedback = 'There was an error uploading a file to Google Drive.';
                vm.transferScreen = false;
                return;
              });
            };
          })
          .catch(function(error) {
            console.error(error);
            vm.feedback = 'There was an error downloading a file from Dropbox.';
            vm.transferScreen = false;
            return;
          });
      }
    },
    /**
    * Ensure that transfer can occur, and then transfer files to Dropbox.
    */
    handleGoogleDriveToDropboxTransfer: function () {
      const vm = this;
      var num_files = vm.google_files_selected.length;
      if (num_files == 0) {
        console.log("No files selected to transfer.");
        vm.feedback = 'No files selected to transfer.';
        return;
      }
      else {
        vm.transferFilesToDropbox();
      }
    },
    /**
    * Download from Google Drive the files that will be transferred,
    * upload each file to Dropbox, then delete the files from
    * Google Drive.
    */
    transferFilesToDropbox: function () {
      const vm = this;
      vm.transferScreen = true;
      var num_files = vm.google_files_selected.length;
      var file_counter = 0;

      for (var i = 0; i < num_files; i++) {
        const selected_file_id = vm.google_files_selected[i].id;
        const selected_file_name = vm.google_files_selected[i].name;
        const selected_file_mimeType = vm.google_files_selected[i].mimeType;
        if (vm.google_files_selected[i].size > 75000000) {
          console.log('Files over 75MB cannot be transferred.');
          vm.feedback = 'Files over 75MB cannot currently be transferred';
          return;
        }
        if (selected_file_mimeType == 'application/vnd.google-apps.folder') {
          var folder_path = selected_file_name + '/';
          //vm.feedback = 'There is currently a bug in the script for tranferring folders from Google Drive to Dropbox, casuing some files to not get transferred.';
          vm.transferGoogleDriveFolderContents(selected_file_id, folder_path);
          //vm.transferScreen = false;
          return;
        }
        var request = gapi.client.request({
          'path': '/drive/v3/files/' + selected_file_id,
          'method': 'GET',
          'params': {'alt': 'media'}
        });
        request.then(function(file) {
          /*if ( file.size > 100000000) {
            console.log("Over 100MB");
            //file over 100mb go break it into parts and come back
            var fileparts = filechunker(file);
            var fileoffset = 0;

            dbx.filesUploadSessionStart({
              contents: fileparts[0],
              close: false,
            })
            .then(function (response) {
              console.log(response);
              var fileid = response;
              fileoffset = fileoffset+fileparts[0].size;

              if (fileparts.length > 2) {
                //need to do the file append recursively calling it one at a time
                var fileappends = function (startkey) {
                  var endkey = fileparts.length-2;

                  dbx.filesUploadSessionAppend({
                    contents: fileparts[startkey],
                    offset: startkey*1000000,
                    session_id: fileid.session_id
                  })
                  .then(function(response){
                    console.log(response);
                    //we have done all of them so return
                    if (startkey == endkey) {
                      filefinish();
                      return 'complete';
                    }
                    else{
                      return fileappends(startkey+1);
                    }
                  })
                  .catch(function (error) {
                    console.log(error, 'on append');
                  });
                }
                //this starts recursively uploading the parts
                fileappends(1);
              }
              else {
                filefinish();
              }

              //if all fileappends are done run the finish
              var filefinish = function () {
                dbx.filesUploadSessionFinish({
                  contents: fileparts[(fileparts.length-1)],
                  cursor: {
                    session_id: fileid.session_id,
                    offset: (fileparts.length-1)*1000000
                  },
                  commit: {
                    path: '/' + file.name,
                    mode: 'overwrite'
                  }
                })
                .then(function (response) {
                  console.log(response);
                  //get the sharing link of the file that was uploaded.
                  dbx.sharingCreateSharedLink({ path : response.path_display })
                  .then(function(response){
                    var request = gapi.client.request({
                      'path': '/drive/v3/files/' + selected_file_id,
                      'method': 'DELETE'
                    });
                    request.then(function(response) {
                      console.log(response);
                      file_counter++;
                      vm.checkTransferComplete(file_counter, num_files, 'dropbox');
                    })
                    .catch(function(error) {
                      console.log(error);
                    });
                  })
                  .catch(function(error) {

                  });
                })
                .catch(function (error) {
                  console.log(error);
                });
              }
            })
            .catch(function (error) {
              console.log(error);
            });
          }
          else {*/
            var dbx = new Dropbox({ accessToken: vm.dropbox_access_token });
            dbx.filesUpload({path: '/' + selected_file_name, contents: file.body})
              .then(function(response) {
                console.log(response);
                var request = gapi.client.request({
                  'path': '/drive/v3/files/' + selected_file_id,
                  'method': 'DELETE'
                });
                request.then(function(response) {
                  console.log(response);
                  file_counter++;
                  vm.checkTransferComplete(file_counter, num_files, 'dropbox');
                })
                .catch(function(error) {
                  console.log(error);
                  console.log(error);
                  vm.feedback = 'There was an error deleting a file from Google Drive.';
                  vm.transferScreen = false;
                  return;
                });
              })
              .catch(function(error) {
                console.error(error);
                console.log(error);
                vm.feedback = 'There was an error uploading a file to Dropbox.';
                vm.transferScreen = false;
                return;
              });
          //}
        })
        .catch(function(error){
          console.log(error);
          console.log(error);
          vm.feedback = 'There was an error downloading a file from Google Drive.';
          vm.transferScreen = false;
          return;
        });
      }
    },
    /**
    * Recursively handles the transferring of folders from Google Drive to Dropbox.
    * PARAMS:
    *   folder_id -> the id of the folder being transferred.
    *   folder_path -> the path for the folder being transferred.
    */
    transferGoogleDriveFolderContents: function (folder_id, folder_path) {
      const vm = this;
      const f_path = folder_path;
      var query = "'" + folder_id + "' in parents and trashed = false";
      gapi.client.drive.files.list({
        'q': query,
        'fields': "nextPageToken, files(id, name, mimeType)"
      }).then(function(response) {
          //console.log(response.body);
          const folder_content = response.result.files;
          var num_files = folder_content.length;
          for (var i = 0; i < num_files; i++) {
            const curr_item = folder_content[i];
            setTimeout(function() {
              if (curr_item.mimeType == 'application/vnd.google-apps.folder') {
                var path = f_path + curr_item.name + '/';
                vm.transferGoogleDriveFolderContents(curr_item.id, path);
              }
              else {
                var request = gapi.client.request({
                  'path': '/drive/v3/files/' + curr_item.id,
                  'method': 'GET',
                  'params': {'alt': 'media'}
                });
                request.then(function(file) {
                  setTimeout(function() {
                    var dbx = new Dropbox({ accessToken: vm.dropbox_access_token });
                    setTimeout(function() {
                      dbx.filesUpload({path: '/' + f_path + curr_item.name, contents: file.body})
                        .then(function(response) {
                          console.log(response);
                          var request = gapi.client.request({
                            'path': '/drive/v3/files/' + curr_item.id,
                            'method': 'DELETE'
                          });
                          request.then(function(response) {
                            console.log(response);
                          })
                          .catch(function(error) {
                            console.log(error);
                          });
                        })
                        .catch(function(error) {
                          console.error(error);
                        });
                      }, 3000);
                    }, 3000);
                })
                .catch(function(error){
                  console.log(error);
                });
              }
            }, 3000);
          }
        })
        .catch(function(error) {
          console.log(error);
          return;
        });
    },
    /**
    * GOAL: To recursively handle transferring on folders from Dropbox to Google Drive,
    * however Google Drive does not support paths in its API, thus making it very
    * difficult to traverse and create a folder tree.
    */
    transferDropboxFolderContents: function (older_path) {
      //Implementation will be added here
    },
    filechunker: function (file) {
    	var chunkSize = 1000000; //1mb roughly
    	var fileSize = file.size;
    	var chunks = Math.ceil(file.size/chunkSize,chunkSize);
    	var chunk = 0;

    	var fileparts = new Array();
    	while (chunk < chunks) {
    		var offset = chunk*chunkSize;
    		fileparts[chunk] = file.slice(offset, offset + chunkSize);
    		chunk++;
    	}
      console.log('file is chunked');
    	return fileparts;
    },
    checkTransferComplete: function (file_counter, num_files, dest) {
      const vm = this;
      if (file_counter == num_files) {
        vm.getDropboxFilesList();
        vm.listGoogleDriveFiles();
        if (dest == 'dropbox') {
          vm.google_files_selected = [];
        }
        else if (dest == 'google'){
          vm.dropbox_files_selected = [];
        }
        setTimeout(function () {
          vm.transferScreen = false;
          vm.feedback = num_files + ' files were transferred successfully.'
        }, 3000);
      }
    }
  },
  computed: {
  },
  mounted: function () {
    const vm = this;
    vm.handleGoogleDriveClientLoad();
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
  color: #fff;
  text-decoration: none;
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
