var Vue = require('vue/dist/vue.js');
var VueRouter = require('vue-router/dist/vue-router.min.js');
Vue.use(VueRouter);

var data = {
  posts: []
};

function returnData() {
  return data;
}

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
      dataObj.posts.push(new Post('Hello World', 1, Date.now(), i * 10, i, "ABC"));
      if (i < 10) {
        setTimeout(function() {
          createPost();
        }, 100);
      }
    }
    createPost();
    // code to add fake posts ends
    //
    return dataObj;
  }
});

var Settings = Vue.extend({
  template: '#settings'
});

Vue.component('post-component', {
  props: ['post'],
  template: '#post-template',
  methods: {
    changeScore: function(score) {
      this.score = score;
    }
  }
});

/*new Vue({
  el: '#app',
  data: data
});*/

var router = new VueRouter({
  mode: 'hash',
  base: '/',
  routes: [
    {
      path: '/home',
      component: Home
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
  router,
  data: data
}).$mount('#app');

var currentId = 1;

function Post(title, id, time, comments, score, posterId, flag) {
  var obj = {};
  if (!title) {
    this.title = "Hello World!!!";
  } else {
    this.title = title;
  }
  if (!id) {
    this.id = Math.random();
  } else {
    this.id = currentId++;
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
}
