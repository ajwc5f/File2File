# What is file2file?

A Web application to transfer items between Dropbox and Google Drive. Focusing on the main functionality of transferring items from one online cloud storage account to another.

## Built With:
- Vue.js
- Webpack
- Npm
- Dropbox V2 Api
- Google Drive V2/V3 Api

## Build Setup
``` bash
# install dependencies
npm install

# serve with hot reload at localhost:8080
npm run dev

# build for production with minification
npm run build

# build for production and view the bundle analyzer report
npm run build --report
```

I suggest cloning or downloading and then running npm install -> npm run dev -> and then visting 'http://localhost:8080' to run the application locally.

## Approach
 - Conduct OAuth login for Dropbox and Google Drive to allow users to have access to thier Dropbox and Google Drive contents.
 - Show a list of items (files and folders) in the root directory of both Dropbox and Google Drive.
 - Select items from either Dropbox or Google Drive to transfer to the other provider.
 - Pure transfer of items less than 75MB (download items from the current provider, upload them to the other provider, and then delete them from the original provider).
 - Allow users to sign in/sign out of the providers as they please.

## Implementation
### Google Drive OAuth2 and Displaying user's Google Drive items
```
/**
* Load the Google Drive auth2 library and API client library.
*/
handleGoogleDriveClientLoad: function () {
  // Load the API's client and auth2 modules.
  // Call the init client function after the modules load.
  gapi.load('client:auth2', this.initGoogleDriveClient);
}
```
To be able to use Google OAuth2, this function must be ran. It will load the Google Drive API's client and auth2 modules. After these modules have been loaded, a call to initailize the Google Drive Client must be present in order to continue the OAuth process and have access to the Google Drive API client library and sign-in state listeners. 

```
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
}
```
Initialization of the Google Drive Client happens by first using the API key of my File2File project and my client id, both created in the Google API console, to get a Google Drive API authorization instance, which can be used to listen for sign-in state changes whenever they may occur and handle the inital sign in state. I also specify how to handle User sign in and sign out when a user clicks on the apprioprate buttons. In this case the discovery docs are located at "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest" and are used by the quickstate. Additionally, the scope is set to "https://www.googleapis.com/auth/drive", specifiying that I will have both read and write access to the Google Drive API.

```
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
}
```
One of the most important steps in the Google OAuth Process, here we specify what happens when the user is signed-in or not. Upon sign-in, the UI will be updated to remove the Authorize button and replace it with a sign out button and also display a list of all the users files in their Google Drive. Upon sign-out, I simply replace the sign out button with the authorization button.

```
/**
* Display list of user Google Drive files containing file name and ID.
*/
listGoogleDriveFiles: function () {
  const vm = this;
  vm.google_files = [];
  gapi.client.drive.files.list({
    'q': "'root' in parents and trashed = false",
    'fields': "nextPageToken, files(id, name, mimeType, size)"
  }).then(function(response) {
    var files = response.result.files;
    if (files && files.length > 0) {
      for (var i = 0; i < files.length; i++) {
        var file = files[i];
        vm.google_files.push(file);
      }
    }
  });
}
```
Here I am using the newly initialized Google Drive API client to send a query to the API, specifying that I want to get a list of all the files and folders in the root directory of the user's Google Drive. On success, this will return an object containing all items - and the id, name, mime type and size of these items. The last step is simply to insert each of these items into an array containing all the user's google files, which can be used to display the items and select items.

### Dropbox OAuth2
Dropbox authentication happens by redirecting the user to the Dropbox authication screen, which when approved whill redirect the user back to file2file, with an access token in the url. This access token can be parsed from the url and used to make requests to the Dropbox API on the user's behalf.

```
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
}
```
The first step in get the user's dropbox files to check if the user is authenicated.
This simply invovles checking:
```
isAuthenticated: function () {
  return !!this.getAccessTokenFromUrl();
}
```
This checks if the user was just redirected from authenticating, and if so, the urls hash will contain the access token.
If the user has not been authenicated, I setup a new Dropbox instance with my client id, and set the authorization link to redirect the user to the authorization page, upon completion of which they will be sent back to my passed in redirect uri of 'http://localhost:8080/'. If the user is already authenicated, then I simply fetch the access token from the url, and use that access token to make a request for the user's dropbox files on their behalf. Rendering the items just involves inserting them into a dropbox files array, the same as with the google files.

### Transfer Files from Dropbox to Google Drive
The first step in transferring files from Dropbox to Google Drive involves getting the number of files to be transferred, setting up a file counter to ensure that all files get transferred okay, and checking for errors.
```
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
      }
```
Due to issues with runtime and efficiency (which will be explained in more detail later), files over 75MB are restricted from being transferred. Also, due to Google Drive API not supporting files path's and only file id -> transferring folders from Dropbox to Google Drive is a considerably large task that would involve creating and maintaining an entire file tree based off ids alone, and thus folder transfer from Dropbox to Google Drive is currently supported.

The next step is to create a Dropbox instance to download each file, which will return a file blob containing the contents of that file in 'application/octet-stream' form. This blob is then read as a binary string and added to a Google Drive upload request using mulitpart file uploading. The idea behind multipart file uploading is to upload the metadata of the file and the contents of the file at the same time, which can be seen below.
```
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
                'body': multipartRequestBody}):
```
Finally, the last steps in transferring the files are to send the Google Drive Client upload request and upon success, delete the uploaded files from dropbox. I check if the transfer is complete by comparing the current file counter value with the number of files to be transferred.

```
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
 ```
 The entire function for Dropbox to Google Drive File transfer is shown below.
 ```
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
```

### Google Drive to Dropbox File/Folder Transfer
Transferring Files from Google Drive to Dropbox is very similar as the vice versa approach shown above, including downloading a file from Google Drive, uploading the contents of the file to Dropbox, and deleting the file from Google Drive and it has been uploaded.
Below, I again find the number of files to transfer, setup a file counter, check for file size, and if it is a folder.
```
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
          vm.transferGoogleDriveFolderContents(selected_file_id, folder_path);
          return;
        }    
```
However, in this implementation, if the file is a folder -> I attempt to transfer it's folder free to Dropbox, as Dropbox supports the uploading based off paths, making the approach much simpiler. That being said, there are issues with the rate limit of uploads that Dropbox accepts, and due to the recursion in the function below, I am firing off requests fast enough that on some upload requests, Dropbox will respond with an 'Error 429: too_many_write_operations', and thus some of the items in the folder tree do not get transferred and are still present on Google Drive.
```
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
      }
```
As can be seen in the function above, using the id and path of the folder to be transferred, I attempt to iterate through the folder tree recursively, and upload the items to Dropbox and delete the items Google Drive as I go. I believe that a solution to the issue of rate limit on uploads would be to either implement threads as a way to upload different files concurrently, or to do it purely asyncronously - downloading, uploading, and deleting a single item at a time, which would prove hard in a recursive function.

In addition to the implementation of folder transferring, for Google Drive to Dropbox, I also attempted to allow transfers of items over 75MB using upload sessions that are offered by Dropbox, where I offset the contents of the file and upload them in sessions. This method is actually successful, but causes so much slow down in the run time - to the point of freezing the browser - and thus I commented out the implementation. Here is that function below:
```
        var request = gapi.client.request({
          'path': '/drive/v3/files/' + selected_file_id,
          'method': 'GET',
          'params': {'alt': 'media'}
        });
        request.then(function(file) {
          /*if ( file.size > 75000000) {
            console.log("Over 75MB");
            //file over 75mb go break it into parts and come back
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
```

Aside from these two additions, transferring from Google Drive to Dropbox is almost the same as the vice versa way, as mentioned before and the code is relatively easy to follow. Here is the function for that below.
```
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
          vm.feedback = 'There is currently a bug in the script for tranferring folders from Google Drive to Dropbox, casuing some files to not get transferred.';
          //vm.transferGoogleDriveFolderContents(selected_file_id, folder_path);
          vm.transferScreen = false;
          return;
        }
        var request = gapi.client.request({
          'path': '/drive/v3/files/' + selected_file_id,
          'method': 'GET',
          'params': {'alt': 'media'}
        });
        request.then(function(file) {
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
        })
        .catch(function(error){
          console.log(error);
          console.log(error);
          vm.feedback = 'There was an error downloading a file from Google Drive.';
          vm.transferScreen = false;
          return;
        });
      }
```
