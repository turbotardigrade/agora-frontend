var data = {
  message: 'Hello Vue.js!',
  posts: []
};


Vue.component('post-component', {
  props: ['title', 'id', 'time', 'comments', 'score', 'posterId'],
  template: '#post-template',
  methods: {
    changeScore: function(score) {
      this.score = score;
    }
  }
})

new Vue({
  el: '#app',
  data: data
});



function Post(title, id, time, comments, score, posterId) {
  var obj = {};
  if (!title) {
    this.title = "Hello World!!!";
  } else {
    this.title = title;
  }
  if (!id) {
    this.id = Math.random();
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
  if (!posterId) {
    this.posterId = "ABC";
  } else {
    this.posterId = posterId;
  }
}
var i = 0;
function createPost() {
  ++i;
  data.posts.push(new Post('Hello World', 1, Date.now(), i * 10, i, "ABC"));
  if (i < 10) {
    setTimeout(function() {
      createPost();
    }, 100);
  }
}
createPost();
