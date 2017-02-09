// definition of a Post object
// must be at the top as it is used by Vue components
Post.currentId = 1;
function Post(title, id, time, comments, score, posterId, flag, commentData) {
  Post.currentId++; // incrementing ID for fake posts

  if (!title) {
    this.title = "Hello World!!!";
  } else {
    this.title = title;
  }
  if (!id) {
    this.id = (Post.currentId);
  } else {
    this.id = id;
  }
  if (!time) {
    this.time = Date.now();
  } else {
    this.time = time;
  }
  if (!comments) {
    this.comments = 10;
  } else {
    this.comments = comments;
  }
  if (!score) {
    this.score = 1;
  } else {
    this.score = score;
  }
  if (!flag) {
    this.flag = false;
  } else {
    this.flag = flag;
  }
  if (!posterId) {
    this.posterId = "ABC";
  } else {
    this.posterId = posterId;
  }
  if (!commentData) {
    this.commentData = getCommentData(this.id);
  } else {
    this.commentData = commentData;
  }
}

// Vue definitions
const Vue = require('vue/dist/vue.js');
const VueRouter = require('vue-router/dist/vue-router.min.js');
Vue.use(VueRouter);

var Home = Vue.extend({
  template: '#home',
  data: function returnData() {
    var dataObj = {
      posts: []
    };

    // code to add fake posts begins
    var i = 0;
    function createPost() {
      ++i;
      dataObj.posts.push(new Post());
      if (i < 10) {
        setTimeout(function() {
          createPost();
        }, 100);
      }
    }
    createPost();
    // code to add fake posts ends

    return dataObj;
  }
});

// @TODO make this globally accessable or turn agora package into a singleton with init function
// Module to interface with the Agora child process
const agora = require('./agora-backend/agora.js');

var Settings = Vue.extend({
  template: '#settings',
  methods: {
    test: function (event) {
      // example request (yes I know it is bad taste to write test cases in actual production code)
      agora.request('abc', { a: 1, b: 2 }, (res) => {
	if (res.error) {
	  console.log('ABC ERROR: ', res.error);
	} else {
	  console.log('ABC RES: ', res.res)
	}
      });
      agora.request('postContent', { author: 'hautonjt' }, (res) => {
	if (res.error) {
	  console.log('POSTCONTENT ERROR: ', res.error);
	} else {
	  console.log('POSTCONTENT RES: ', res.res)
	}
      });
    }
  }
});

Vue.component('post-component', {
  props: ['post'],
  template: '#post-template'
});

/*new Vue({
  el: '#app',
  data: data
});*/

var router = new VueRouter({
  mode: 'history',
  base: '/',
  routes: [
    {
      path: '/',
      component: Home
    },
    {
      path: '/settings',
      component: Settings
    },
    {
      path: '*',
      redirect: '/'
    }
  ],
  linkActiveClass: "active"
});

const app = new Vue({
  router
}).$mount('#app');

function getCommentData(postId) {
  return [];
}
