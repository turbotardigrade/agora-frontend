const { ipcRenderer } = require('electron');
const util = require('util');

class Content {
  constructor({ Alias, Content, Timestamp, Hash, Key, UserData }) {
    this.Alias = Alias;
    this.Content = Content;
    this.Timestamp = Timestamp;
    this.Hash = Hash;
    this.Key = Key;
    this.ChildComments = {};
    this.Score = UserData.Score;
    this.Flag = UserData.Flag;
  }
};

class Post extends Content {
  constructor({ Alias, Content, Timestamp, Hash, Key, UserData, Title }) {
    super({ Alias, Content, Timestamp, Hash, Key, UserData });
    this.Title = Title;
  }
};

Post.currentId = 1;

class Comment extends Content {
  constructor({ Post, Parent, Alias, Content, Timestamp, Hash, Key, UserData }) {
    super({ Alias, Content, Timestamp, Hash, Key, UserData });
    this.Post = Post;
    this.Parent = Parent;
  }
};

Comment.currentId = 1;

// Vue definitions
const Vue = require('vue/dist/vue.js');
const VueRouter = require('vue-router/dist/vue-router.js');
const Vuex = require('vuex/dist/vuex.js');

Vue.use(VueRouter);
Vue.use(Vuex)

const store = new Vuex.Store({
  state: {
    postMap: {},
    commentMap: {},
    commentBuffer: [],
    currentHomeTabPage: null,
  },
  mutations: {
    updatePostMap(state, post) {
      let ChildComments = {};
      if (state.postMap[post.Hash] != null) {
        ChildComments = state.postMap[post.Hash].ChildComments;
      }
      Vue.set(state.postMap, post.Hash, post);
      state.postMap[post.Hash].ChildComments = ChildComments;
    },
    incrementScore(state, postHash) {
      state.postMap[postHash].Score += 1
    },
    decrementScore(state, postHash) {
      state.postMap[postHash].Score = state.postMap[postHash].Score === 0 ?
                                      0 : state.postMap[postHash].Score - 1
    },
    toggleFlag(state, postHash) {
      state.postMap[postHash].Flag = !state.postMap[postHash].Flag;
      // send update to agora
    },
    toggleCommentFlag(state, commentHash) {
      state.commentMap[commentHash].Flag = !state.commentMap[commentHash].Flag;
    },
    // synchronously add comment to the commentmap and updates parent pointers
    // if it is a new comment
    addOrUpdateComment(state, comment) {
      if ((comment.Parent === comment.Post &&
            state.postMap[comment.Parent] == null) ||
          (comment.Parent !== comment.Post &&
            state.commentMap[comment.Parent] == null)) {
        // parent is not currently inserted yet, put into buffer
        state.commentBuffer.push_back(comment);
        return;
      }
      // comment already exists, no need to set child pointers of parents
      if (state.commentMap[comment.Hash] != null) {
        state.commentMap[comment.Hash].Score = comment.Score;
        state.commentMap[comment.Hash].Flag = comment.Flag;
        return;
      }

      if (comment.Parent === comment.Post) {
        if (!state.postMap[comment.Parent].ChildComments) {
          Vue.set(state.postMap[comment.Parent], ChildComments, {});
        }
        Vue.set(state.postMap[comment.Parent].ChildComments,
          comment.Hash, comment);
      } else {
        if (!state.commentMap[comment.Parent].ChildComments) {
          Vue.set(state.commentMap[comment.Parent], ChildComments, {});
        }
        Vue.set(state.commentMap[comment.Parent].ChildComments,
          comment.Hash, comment);
      }
      Vue.set(state.commentMap, comment.Hash, comment);
    },
    setCurrentHomeTabPage(state, page) {
      state.currentHomeTabPage = page;
    }
  },
  actions: {
    // repropagates the post map with data from agora
    refreshPosts({ commit }) {
      sendAgoraRequest({ command: "getPosts" }, function(result) {
        for (let i = 0; i < result.length; ++i) {
          commit('updatePostMap', result[i]);
        }
      });
    },
    // repropagates the comment map with data from agora
    refreshComments({ commit, state }, postHash) {
      sendAgoraRequest({
        command: 'getCommentsFromPost',
        arguments: {
          hash: postHash
        }
      }, function(result) {
        for (let i = 0; i < result.length; ++i) {
          commit('addOrUpdateComment', result[i]);
        }
      });
      // account for comments whose order is mixed up
      // traverse (max buffer length)^2 times, since
      // each traversal is only guaranteed to have one element
      // match and be deallocated
      let bufferLength = state.commentBuffer.length;
      for(let j = bufferLength * bufferLength; j > 0; --j) {
        let k = state.commentBuffer.shift();
        if (!k) {
          break;
        }
        commit('addOrUpdateComment', k);
      }
    },
    addComment({ commit, state }, arguments) {
      sendAgoraRequest({
        command: 'postComment',
        arguments: arguments
      }, function(result) {
        sendAgoraRequest({
          command: 'getComment',
          arguments: {
            hash: result.hash
          }
        }, function(res) {
          commit('addOrUpdateComment', res);
        })
      });
    },
    addPost({ commit, state }, arguments) {
      sendAgoraRequest({
        command: 'postPost',
        arguments: arguments
      }, function(result) {
        sendAgoraRequest({
          command: 'getPost',
          arguments: {
            hash: result.hash
          }
        }, function(res) {
          commit('updatePostMap', res);
        })
      });
    }
  },
  strict: true
});

// home page
const Home = Vue.extend({
  template: '#home',
  beforeRouteEnter(to, from, next) {
    console.log("hello: ", to.path);
    if (!to.path.includes('comments') &&
        store.state.currentHomeTabPage !== null) {
      next('/home/post-list/' + store.state.currentHomeTabPage + '/comments');
    } else {
      next();
    }
  }
});

// PostPage shows a list of posts
const PostPage = Vue.extend({
  template: '#home-list',
  computed: {
    posts() {
      let obj = this.$store.state.postMap;
      return Object.keys(obj).map(function(key) {
        return obj[key];
      }).sort((a, b) => {
        return b.score - a.score;
      });
    }
  },
  beforeRouteEnter(to, from, next) {
    store.commit('setCurrentHomeTabPage', null);
    next();
  }
});

Vue.component('post-list-component', {
  props: ['post'],
  template: '#post-list-item',
  methods: {
    increment() {
      this.$store.commit('incrementScore', this.post.Hash);
    },
    decrement() {
      this.$store.commit('decrementScore', this.post.Hash);
    },
    toggleFlag() {
      this.$store.commit('toggleFlag', this.post.Hash);
    }
  }
});

// CommmentsPage shows a list of comments
const CommentPage = Vue.extend({
  props: ['postHash'],
  template: '#comment-list',
  computed: {
    posts() {
      return this.$store.state.postMap;
    }
  },
  beforeRouteEnter(to, from, next) {
    store.commit('setCurrentHomeTabPage', to.params.postHash);
    next();
  }
});

Vue.component('comment-list-post', {
  props: ['post'],
  template: '#comment-list-post-item',
  methods: {
    increment() {
      this.$store.commit('incrementScore', this.post.Hash);
    },
    decrement() {
      this.$store.commit('decrementScore', this.post.Hash);
    },
    toggleFlag() {
      this.$store.commit('toggleFlag', this.post.Hash);
    }
  }
});

Vue.component('comment-list-comment', {
  props: ['comment'],
  template: '#comment-list-comment-item',
  methods: {
    toggleCommentFlag() {
      this.$store.commit('toggleCommentFlag', this.comment.Hash);
    }
  }
});

const Settings = Vue.extend({
  template: '#settings',
  data: function() {
    return { agoraTestLogs: [] };
  },
  methods: {
    test(event) {
      let logs = this.agoraTestLogs;
      // example request (yes I know it is bad taste to write test cases in actual production code)
      sendAgoraRequest({
        command: 'abc',
        arguments: { a: 1, b: 2 }
      }, (res) => {
        if (res.error) {
          logs.push(util.format('ABC ERROR: ', res.error));
        } else {
          logs.push(util.format('ABC RES: ', res.res));
        }
      });
      sendAgoraRequest({
        command: 'postContent',
        arguments: { author: 'hautonjt' }
      }, (res) => {
        if (res.error) {
          logs.push(util.format('POSTCONTENT ERROR: ', res.error));
        } else {
          logs.push(util.format('POSTCONTENT RES: ', res.res))
        }
      });
    },
    clear() {
      this.agoraTestLogs = [];
    }
  }
});

let router = new VueRouter({
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
          path: 'post-list/:postHash/comments',
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
let i = 0;
function createPost() {
  ++i;
  let post = new Post({
    Alias: 'hautonjt',
    Content: "HELLO I AM AWESOME!!",
    Title: "Hello World!!!",
    Timestamp: Date.now(),
    Hash: (Post.currentId++),
    Key: Math.random(),
    ChildComments: {},
    UserData: {
      Score: 0,
      Flag: false
    }
  });
  store.commit('updatePostMap', post);
  for (let j = 0; j < i; ++j) {
    let comment = new Comment({
      Alias: "hautonjt",
      Content: "Hi I am awesome too!",
      Timestamp: Date.now(),
      Hash: (Comment.currentId++),
      Key: Math.random(),
      Post: post.Hash,
      Parent: post.Hash,
      ChildComments: {},
      UserData: {
        Score: 0,
        Flag: false
      }
    });
    store.commit('addOrUpdateComment', comment);
    createNestedComment(comment, j % 5);

  }
  if (i < 10) {
    setTimeout(function() {
      createPost();
    }, 100);
  }
}
createPost();
function createNestedComment(comment, times) {
  for (let k = 0; k < times; ++k) {
    let nestedComment = new Comment({
      Alias: "hautonjt",
      Content: "Hi I am awesome too!",
      Timestamp: Date.now(),
      Hash: (Comment.currentId++),
      Key: Math.random(),
      Post: comment.Post,
      Parent: comment.Hash,
      ChildComments: {},
      UserData: {
        Score: 0,
        Flag: false
      }
    });
    store.commit('addOrUpdateComment', nestedComment);
    createNestedComment(nestedComment, times - 2)
  }
}
// code to add fake posts ends

// agora send and reply handling code
let callbackMap = {};
function sendAgoraRequest({ command, arguments}, callback) {
  this.agoraRequestId = ++this.agoraRequestId || 1;
  callbackMap[this.agoraRequestId] = callback;
  ipcRenderer.send('agora-request', {
    id: this.agoraRequestId,
    req: {
      command: command,
      arguments: arguments
    }
  });
}

ipcRenderer.on('agora-reply', function (event, {id, result}) {
  callbackMap[id](result);
})
