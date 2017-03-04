'use strict';

const { ipcRenderer } = require('electron');

// agora send and reply handling code
let callbackMap = {};
let agoraRequestId = 0;
function sendAgoraRequest(commandObj, callback) {
  ++agoraRequestId;
  callbackMap[agoraRequestId] = callback;
  ipcRenderer.send('agora-request', {
    id: agoraRequestId,
    req: {
      command: commandObj.command,
      arguments: commandObj.arguments
    }
  });
}

ipcRenderer.on('agora-reply', function (event, {id, result}) {
  callbackMap[id](result);
})

const util = require('util');

class Content {
  constructor({ Alias, Content, Timestamp, Hash, Key, UserData }) {
    this.Alias = Alias;
    this.Content = Content;
    this.Timestamp = Timestamp * 1000;
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

class Comment extends Content {
  constructor({ Post, Parent, Alias, Content, Timestamp, Hash, Key, UserData }) {
    super({ Alias, Content, Timestamp, Hash, Key, UserData });
    this.Post = Post;
    this.Parent = Parent;
  }
};

Post.currentId = 1;
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

      sendAgoraRequest({
	command: "flag",
	arguments: {
	  hash: postHash,
	  isFlagged: state.postMap[postHash].Flag
	}
      }, function(result) {
        if (!result) {
          return;
        }
      });
    },
    toggleCommentFlag(state, commentHash) {
      state.commentMap[commentHash].Flag = !state.commentMap[commentHash].Flag;

      sendAgoraRequest({
	command: "flag",
	arguments: {
	  hash: commentHash,
	  isFlagged: state.commentMap[commentHash].Flag
	}
      }, function(result) {
        if (!result) {
          return;
        }
      });
    },
    // synchronously add comment to the commentmap and updates parent pointers
    // if it is a new comment
    addOrUpdateComment(state, comment) {
      if ((comment.Parent === comment.Post &&
            state.postMap[comment.Parent] == null) ||
          (comment.Parent !== comment.Post &&
            state.commentMap[comment.Parent] == null)) {
        // parent is not currently inserted yet, put into buffer
        state.commentBuffer.push(comment);
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
        if (!result) {
          return;
        }
        for (let i = 0; i < result.length; ++i) {
          commit('updatePostMap', new Post(result[i]));
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
        if (!result) {
          return;
        }
        for (let i = 0; i < result.length; ++i) {
          commit('addOrUpdateComment', new Comment(result[i]));
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
    addComment({ commit, state }, argument) {
      sendAgoraRequest({
        command: 'postComment',
        arguments: argument
      }, function(result) {
        sendAgoraRequest({
          command: 'getComment',
          arguments: {
            hash: result.hash
          }
        }, function(res) {
          commit('addOrUpdateComment', new Comment(res));
        })
      });
    },
    addPost({ commit, state }, argument) {
      sendAgoraRequest({
        command: 'postPost',
        arguments: argument
      }, function(result) {

        sendAgoraRequest({
          command: 'getPost',
          arguments: {
            hash: result.hash
          }
        }, function(res) {
          commit('updatePostMap', new Post(res));
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
  data: function() {
    return {
      postToSubmit: {
        title: '',
        content: ''
      },
      addpost: false
    };
  },
  computed: {
    posts() {
      let obj = this.$store.state.postMap;
      return Object.keys(obj).map(function(key) {
        return obj[key];
      }).sort((a, b) => {
        if (b.Score - a.Score === 0) {
          return b.Timestamp > a.Timestamp;
        }
        return b.Score - a.Score;
      });
    }
  },
  methods: {
    submitPost() {
      let tempPost = {
        title: this.postToSubmit.title,
        content: this.postToSubmit.content
      };
      this.$store.dispatch('addPost', tempPost);
      this.postToSubmit.title = '';
      this.postToSubmit.content = '';
    },
    refreshPosts() {
      this.$store.dispatch('refreshPosts');
    }
  },
  beforeRouteEnter(to, from, next) {
    store.dispatch('refreshPosts');
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
    store.dispatch('refreshComments', to.params.postHash);
    next();
  }
});

Vue.component('comment-list-post', {
  props: ['post'],
  template: '#comment-list-post-item',
  data: function() {
    return {
      showReplyBox: false,
      comment: {
        content: ''
      }
    };
  },
  methods: {
    increment() {
      this.$store.commit('incrementScore', this.post.Hash);
    },
    decrement() {
      this.$store.commit('decrementScore', this.post.Hash);
    },
    toggleFlag() {
      this.$store.commit('toggleFlag', this.post.Hash);
    },
    submitComment() {
      let tempComment = {
        content: this.comment.content,
        post: this.post.Hash,
        parent: this.post.Hash
      }
      this.$store.dispatch('addComment', tempComment);
      this.comment.content = '';
      showReplyBox = false;
    }
  }
});

Vue.component('comment-list-comment', {
  props: ['comment', 'posthash'],
  template: '#comment-list-comment-item',
  data: function() {
    return {
      showReplyBox: false,
      content: ''
    }
  },
  methods: {
    toggleCommentFlag() {
      this.$store.commit('toggleCommentFlag', this.comment.Hash);
    },
    submitComment() {
      let tempComment = {
        content: this.content,
        post: this.posthash,
        parent: this.comment.Hash
      }
      this.$store.dispatch('addComment', tempComment);
      this.content = '';
      this.showReplyBox = false;
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

/*
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
*/
