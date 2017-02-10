// definition of a Post object and Comment object
// must be at the top as it is used by Vue components
Post.currentId = 1;
function Post({ title, id, time, score,
                flag, authorId, childComments, content }) {
  this.title = title;
  this.id = id;
  this.time = time;
  this.score = score;
  this.flag = flag;
  this.authorId = authorId;
  this.childComments = childComments;
  this.content = content;
}

Comment.currentId = 1;
function Comment({ content, authorId, commentId,
                   time, flag, childComments }) {
  this.content = content;
  this.authorId = authorId;
  this.id = commentId;
  this.time = time;
  this.flag = flag;
  this.childComments = childComments;
}

// Vue definitions
const Vue = require('vue/dist/vue.js');
const VueRouter = require('vue-router/dist/vue-router.js');
const Vuex = require('vuex/dist/vuex.js');

Vue.use(VueRouter);
Vue.use(Vuex)

const store = new Vuex.Store({
  state: {
    postMap: {},
    commentMap: {}
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
    toggleCommentFlag(state, commentId) {
      state.commentMap[commentId].flag = !state.commentMap[commentId].flag;
    },
    addOrUpdateComment(state, { comment, postParentId, commentParentId }) {
      if (postParentId) {
        if (!state.postMap[postParentId].childComments) {
          Vue.set(state.postMap[postParentId], childComments, {});
        }
        Vue.set(state.postMap[postParentId].childComments, comment.id, comment);
      } else if (commentParentId) {
        if (!state.commentMap[commentParentId].childComments) {
          Vue.set(state.commentMap[commentParentId], childComments, {});
        }
        Vue.set(state.commentMap[commentParentId].childComments,
          comment.id, comment);
      }
      Vue.set(state.commentMap, comment.id, comment);
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

Vue.component('comment-list-comment', {
  props: ['comment'],
  template: '#comment-list-comment-item',
  methods: {
    toggleCommentFlag() {
      console.log('Comment id: ', this.comment.id);
      this.$store.commit('toggleCommentFlag', this.comment.id);
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
    score: Math.round(Math.random() * 10),
    flag: false,
    authorId: "ABC",
    childComments: {},
    content: "HELLO I AM AWESOME!!"
  });
  store.commit('updatePostMap', post);
  for (var j = 0; j < i; ++j) {
    var comment = new Comment({
      content: "Hi I am awesome too!",
      authorId: "hautonjt",
      commentId: (Comment.currentId++),
      time: Date.now(),
      flag: false,
      childComments: {}
    });
    store.commit('addOrUpdateComment', {
      comment: comment,
      postParentId: post.id
    });
    createNestedComment(comment, j % 5);

  }
  if (i < 10) {
    setTimeout(function() {
      createPost();
    }, 100);
  }
}
createPost();
// code to add fake posts ends
function createNestedComment(comment, times) {
  for (var k = 0; k < times; ++k) {
    var nestedComment = new Comment({
      content: "Hi I am a nested comment!",
      authorId: "hautonjt",
      commentId: (Comment.currentId++),
      time: Date.now(),
      flag: false,
      childComments: {}
    });
    store.commit('addOrUpdateComment', {
      comment: nestedComment,
      commentParentId: comment.id
    });
    createNestedComment(nestedComment, times - 1)
  }
}
