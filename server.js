require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Validate API key on startup
if (!process.env.GOOGLE_BOOKS_API_KEY) {
  console.error('ERROR: GOOGLE_BOOKS_API_KEY not found in environment variables');
  process.exit(1);
}

/**
 * GET /books/details
 * Fetch book details from Google Books API
 */
app.get('/books/details', async (req, res) => {
  try {
    // Validate input
    const { title, exactMatch = false } = req.query;
    if (!title) {
      return res.status(400).json({ error: 'Title parameter is required' });
    }

    // Call Google Books API
    const response = await axios.get(
      `https://www.googleapis.com/books/v1/volumes`,
      {
        params: {
          q: title,
          key: process.env.GOOGLE_BOOKS_API_KEY,
          maxResults: 5,
          printType: 'books'
        },
        timeout: 5000 // 5 second timeout
      }
    );

    // Process results
    const items = response.data.items || [];
    if (items.length === 0) {
      return res.status(404).json({ error: 'No books found' });
    }

    // Find best match
    let book;
    if (exactMatch) {
      book = items.find(item => 
        item.volumeInfo.title.toLowerCase() === title.toLowerCase()
      );
      if (!book) {
        return res.status(404).json({ error: 'No exact title match found' });
      }
    } else {
      book = items[0]; // Take first result
    }

    // Extract and format data
    const { volumeInfo } = book;
    const result = {
      title: volumeInfo.title || 'Unknown',
      pages: volumeInfo.pageCount || null,
      author: volumeInfo.authors ? 
        (volumeInfo.authors.length === 1 ? volumeInfo.authors[0] : volumeInfo.authors) : 
        'Unknown',
      genre: volumeInfo.categories ?
        (volumeInfo.categories.length === 1 ? volumeInfo.categories[0] : volumeInfo.categories) :
        'Unknown',
      publisher: volumeInfo.publisher || 'Unknown',
      published: volumeInfo.publishedDate || 'Unknown',
      language: volumeInfo.language || 'Unknown',
      isbn: volumeInfo.industryIdentifiers?.find(id => id.type === 'ISBN_13')?.identifier || null,
      source: 'Google Books'
    };

    res.json(result);

  } catch (error) {
    console.error('API Error:', error.message);
    
    if (error.response) {
      // Google API error response
      res.status(error.response.status).json({
        error: 'Google Books API error',
        details: error.response.data.error?.message
      });
    } else if (error.request) {
      // No response received
      res.status(504).json({ error: 'Request to Google Books timed out' });
    } else {
      // Other errors
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Using Google Books API key: ${process.env.GOOGLE_BOOKS_API_KEY.substring(0, 5)}...`);
});

module.exports = app;