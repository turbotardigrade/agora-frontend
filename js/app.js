// definition of a Post object
// must be at the top as it is used by Vue components
Post.currentId = 1;
function Post(title, id, time, comments, score, posterId, flag, commentData) {
  if (!title) {
    this.title = "Hello World!!!";
  } else {
    this.title = title;
  }
  if (!id) {
    this.id = (Post.currentId++); // incrementing ID for fake posts
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

var postMap = {}

// Vue definitions
const Vue = require('vue/dist/vue.js');
const VueRouter = require('vue-router/dist/vue-router.min.js');
Vue.use(VueRouter);

// home page
const Home = Vue.extend({
  template: '#home'
});

var postMap = {};

// code to add fake posts begins
var i = 0;
function createPost() {
  ++i;
  var post = new Post();
  Vue.set(postMap, post.id, post);
  if (i < 10) {
    setTimeout(function() {
      createPost();
    }, 100);
  }
}
createPost();
// code to add fake posts ends

// PostPage shows a list of posts
const PostPage = Vue.extend({
  template: '#home-list',
  data: function returnData() {
    return {
      posts: postMap
    };
  }
});

Vue.component('post-list-component', {
  props: ['post'],
  template: '#post-list-item'
});

// CommmentsPage shows a list of comments
const CommentPage = Vue.extend({
  props: ['postid'],
  template: '#comment-list',
  data: function returnData() {
    return {
      posts: postMap
    };
  },
  methods: {
    getpostid() {
      console.log('here: ', this.postid);
      return this.postid;
    }
  }
});

Vue.component('comment-list-post', {
  props: ['post'],
  template: '#comment-list-post-item'
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
/*new Vue({
  el: '#app',
  data: data
});*/

var router = new VueRouter({
  mode: 'history',
  base: '/',
  routes: [
    {
      path: '/home',
      component: Home,
      children: [
        {
          path: 'post-list',
          component: PostPage
        },
        {
          name: 'comments',
          path: 'post-list/:postid/comments',
          component: CommentPage,
          props: true
        },
        {
          path: '',
          redirect: 'post-list'
        }
      ]
    },
    {
      path: '/settings',
      component: Settings
    },
    {
      path: '*',
      redirect: '/home'
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
