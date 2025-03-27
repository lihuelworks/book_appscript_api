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
    const { title, author, language, publisher, subject, isbn, exactMatch = false } = req.query;
    if (!title && !author && !publisher && !subject && !isbn && !language) {
      return res.status(400).json({ error: 'At least one search parameter is required' });
    }

    let searchQuery = '';
    if (title) searchQuery += `intitle:${encodeURIComponent(title)}`;
    if (author) searchQuery += `${searchQuery ? '+' : ''}inauthor:${encodeURIComponent(author)}`;
    if (publisher) searchQuery += `${searchQuery ? '+' : ''}inpublisher:${encodeURIComponent(publisher)}`;
    if (subject) searchQuery += `${searchQuery ? '+' : ''}subject:${encodeURIComponent(subject)}`;
    if (isbn) searchQuery += `${searchQuery ? '+' : ''}isbn:${encodeURIComponent(isbn)}`;
    if (language) searchQuery += `${searchQuery ? '+' : ''}language:${encodeURIComponent(language)}`;

    const response = await axios.get('https://www.googleapis.com/books/v1/volumes', {
      params: {
        q: searchQuery,
        key: process.env.GOOGLE_BOOKS_API_KEY,
        maxResults: 5,
        printType: 'books',
        langRestrict: language || 'en'
      },
      timeout: 5000
    });

    const items = response.data.items || [];
    if (items.length === 0) {
      return res.status(404).json({ error: 'No books found' });
    }

    let book = items[0];
    if (exactMatch) {
      const exactMatchBook = items.find(item => {
        const titleMatch = title ? item.volumeInfo.title.toLowerCase() === title.toLowerCase() : true;
        const authorMatch = author ? item.volumeInfo.authors?.some(a => a.toLowerCase().includes(author.toLowerCase())) : true;
        return titleMatch && authorMatch;
      });
      if (exactMatchBook) book = exactMatchBook;
    }

    const result = {
      title: book.volumeInfo.title || 'Unknown',
      pages: book.volumeInfo.pageCount || null,
      author: book.volumeInfo.authors || 'Unknown',
      genre: book.volumeInfo.categories || 'Unknown',
      publisher: book.volumeInfo.publisher || 'Unknown',
      published: book.volumeInfo.publishedDate || 'Unknown',
      language: book.volumeInfo.language || 'Unknown',
      isbn: book.volumeInfo.industryIdentifiers?.find(id => id.type === 'ISBN_13')?.identifier || null,
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
