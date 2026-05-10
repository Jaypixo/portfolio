const fs = require('fs');
const path = require('path');

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const POSTS_FILE = path.join(__dirname, 'posts.json');

function readPosts() {
  if (!fs.existsSync(POSTS_FILE)) {
    fs.writeFileSync(POSTS_FILE, JSON.stringify([]));
  }
  return JSON.parse(fs.readFileSync(POSTS_FILE));
}

function writePosts(posts) {
  fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));
}

rl.question('Post title: ', (title) => {
  rl.question('Post content (end with empty line): ', (content) => {
    let fullContent = content;
    const collectContent = () => {
      rl.question('', (line) => {
        if (line === '') {
          const posts = readPosts();
          const newPost = {
            id: Date.now(),
            title,
            content: fullContent,
            date: new Date().toISOString()
          };
          posts.unshift(newPost);
          writePosts(posts);
          console.log('Post added!');
          rl.close();
        } else {
          fullContent += '\n' + line;
          collectContent();
        }
      });
    };
    if (content === '') {
      console.log('Content cannot be empty.');
      rl.close();
    } else {
      collectContent();
    }
  });
});