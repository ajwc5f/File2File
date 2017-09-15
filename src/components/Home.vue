<template>
  <div class="home">
    <div class="container main">
      <div id="pre-auth-section" style="display:none;">
        <a href="" id="authlink" class="button">Authenticate Dropbox</a>
      </div>

      <div id="authed-section" style="display:none;">
        <p>You have successfully authenticated Dropbox. Below are the contents of your root directory.</p>
        <ul id="files"></ul>
      </div>
    </div>
  </div>
</template>

<script>
import Dropbox from 'dropbox';

export default {
  name: 'home',
  data () {
    return {
      dropbox_client_id: 'xa0607rzubdwd51',
      dropbox_access_token: ''
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
    // Render a list of items to #files
    renderItems: function (items) {
      var filesContainer = document.getElementById('files');
      items.forEach(function(item) {
        var li = document.createElement('li');
        li.innerHTML = item.name;
        filesContainer.appendChild(li);
      });
    },
    // This example keeps both the authenticate and non-authenticated setions
    // in the DOM and uses this function to show/hide the correct section.
    showPageSection: function (elementId) {
      document.getElementById(elementId).style.display = 'block';
    }
  },
  mounted: function () {
    const vm = this;

    if (vm.isAuthenticated()) {
      vm.showPageSection('authed-section');
      // Create an instance of Dropbox with the access token and use it to
      // fetch and render the files in the users root directory.

      var dbx = new Dropbox({ accessToken: vm.getAccessTokenFromUrl() });
      dbx.filesListFolder({path: ''})
      .then(function(response) {
        vm.renderItems(response.entries);
      })
      .catch(function(error) {
        console.error(error);
      });
      /*var dbx = new Dropbox({ accessToken: vm.getAccessTokenFromUrl() });
      dbx.filesListFolder({path: ''})
      .then(function(response) {
        vm.renderItems(response.entries);
      })
      .catch(function(error) {
        console.error(error);
      });*/
    }
    else {
      vm.showPageSection('pre-auth-section');
      // Set the login anchors href using dbx.getAuthenticationUrl()
      var dbx = new Dropbox({ clientId: vm.dropbox_client_id });
      var authUrl = dbx.getAuthenticationUrl('http://localhost:8080');
      document.getElementById('authlink').href = authUrl;
    }
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
