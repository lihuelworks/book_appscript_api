require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

if (!process.env.GOOGLE_BOOKS_API_KEY) {
  console.error('ERROR: GOOGLE_BOOKS_API_KEY not found');
  process.exit(1);
}

app.get('/books/details', async (req, res) => {
  try {
    const { title, author, exactMatch = false } = req.query;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    // Build search query - include author if provided
    let searchQuery = `intitle:${encodeURIComponent(title)}`;
    if (author) {
      searchQuery += `+inauthor:${encodeURIComponent(author)}`;
    }

    const response = await axios.get(
      'https://www.googleapis.com/books/v1/volumes',
      {
        params: {
          q: searchQuery,
          key: process.env.GOOGLE_BOOKS_API_KEY,
          maxResults: 5,
          printType: 'books'
        },
        timeout: 5000
      }
    );

    const items = response.data.items || [];
    if (items.length === 0) {
      return res.status(404).json({ error: 'No books found' });
    }

    // Find matching book
    let book = items[0];
    if (exactMatch) {
      const exactMatchBook = items.find(item => {
        const titleMatch = item.volumeInfo.title.toLowerCase() === title.toLowerCase();
        const authorMatch = !author || 
          (item.volumeInfo.authors && 
           item.volumeInfo.authors.some(a => a.toLowerCase().includes(author.toLowerCase())));
        return titleMatch && authorMatch;
      });
      if (exactMatchBook) book = exactMatchBook;
    }

    // Format response
    const result = {
      title: book.volumeInfo.title || 'Unknown',
      pages: book.volumeInfo.pageCount || null,
      author: book.volumeInfo.authors ? 
        (book.volumeInfo.authors.length === 1 ? 
          book.volumeInfo.authors[0] : 
          book.volumeInfo.authors) : 
        'Unknown',
      genre: book.volumeInfo.categories ?
        (book.volumeInfo.categories.length === 1 ? 
          book.volumeInfo.categories[0] : 
          book.volumeInfo.categories) :
        'Unknown',
      publisher: book.volumeInfo.publisher || 'Unknown',
      published: book.volumeInfo.publishedDate || 'Unknown',
      language: book.volumeInfo.language || 'Unknown',
      isbn: book.volumeInfo.industryIdentifiers?.find(id => 
        id.type === 'ISBN_13')?.identifier || null,
      source: 'Google Books'
    };

    res.json(result);

  } catch (error) {
    console.error('API Error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});