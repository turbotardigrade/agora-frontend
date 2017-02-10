// definition of a Post object and Comment object
// must be at the top as it is used by Vue components
Post.currentId = 1;
function Post({ title, id, time, score,
                flag, authorId, commentData, content }) {
  this.title = title;
  this.id = id;
  this.time = time;
  this.score = score;
  this.flag = flag;
  this.authorId = authorId;
  this.commentData = commentData;
  this.content = content;
}

Comment.currentId = 1;
function Comment({ content, authorId, commentId }) {
  this.content = content;
  this.authorId = authorId;
  this.commentId = commentId;
}

// Vue definitions
const Vue = require('vue/dist/vue.js');
const VueRouter = require('vue-router/dist/vue-router.js');
const Vuex = require('vuex/dist/vuex.js');

Vue.use(VueRouter);
Vue.use(Vuex)

const store = new Vuex.Store({
  state: {
    postMap: {}
  },
  mutations: {
    updatePostMap(state, post) {
      Vue.set(state.postMap, post.id, post);
    },
    incrementScore(state, postId) {
      state.postMap[postId].score += 1
    },
    decrementScore(state, postId) {
      state.postMap[postId].score = state.postMap[postId].score === 0 ?
                                      0 : state.postMap[postId].score - 1
    },
    toggleFlag(state, postId) {
      state.postMap[postId].flag = !state.postMap[postId].flag;
      // send update to agora
    },
    addComment(state, comment) {
      if(state.postMap[postId].commentData) {
        state.postMap[postId].commentData.push(comment);
      } else {
        state.postMap[postId].commentData = [comment];
      }
    }
  },
  strict: true
});

// home page
const Home = Vue.extend({
  template: '#home'
});

// PostPage shows a list of posts
const PostPage = Vue.extend({
  template: '#home-list',
  data: function returnData() {
    return {};
  },
  computed: {
    posts() {
      var obj = this.$store.state.postMap;
      return Object.keys(obj).map(function(key) {
        return obj[key];
      }).sort((a, b) => {
        return b.score - a.score;
      });
    }
  }
});

Vue.component('post-list-component', {
  props: ['post'],
  template: '#post-list-item',
  methods: {
    increment() {
      this.$store.commit('incrementScore', this.post.id);
    },
    decrement() {
      this.$store.commit('decrementScore', this.post.id);
    },
    toggleFlag() {
      this.$store.commit('toggleFlag', this.post.id);
    }
  }
});

// CommmentsPage shows a list of comments
const CommentPage = Vue.extend({
  props: ['postid'],
  template: '#comment-list',
  data: function returnData() {
    return {};
  },
  computed: {
    posts() {
      return this.$store.state.postMap;
    }
  }
});

Vue.component('comment-list-post', {
  props: ['post'],
  template: '#comment-list-post-item',
  methods: {
    increment() {
      this.$store.commit('incrementScore', this.post.id);
    },
    decrement() {
      this.$store.commit('decrementScore', this.post.id);
    },
    toggleFlag() {
      this.$store.commit('toggleFlag', this.post.id);
    }
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
  router,
  store
}).$mount('#app');


// code to add fake posts begins
var i = 0;
function createPost() {
  ++i;
  var post = new Post({
    title: "Hello World!!!",
    id: (Post.currentId++),
    time: Date.now(),
    score: Math.round(Math.random() * 100),
    flag: false,
    authorId: "ABC",
    commentData: [],
    content: "HELLO I AM AWESOME!!"
  });
  for (var j = 0; j < i; ++j) {
    post.commentData.push(new Comment({
      content: "Hi I am awesome too!",
      authorId: "hautonjt",
      commentId: (Comment.currentId++)
    }));
  }
  store.commit('updatePostMap', post);
  if (i < 10) {
    setTimeout(function() {
      createPost();
    }, 100);
  }
}
createPost();
// code to add fake posts ends
