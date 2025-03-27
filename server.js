const express = require('express');
const { search } = require('book-api');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON requests
app.use(express.json());

/**
 * GET /books/details
 * Returns book details including pages, author, and genre
 * 
 * Query Parameters:
 *   title: string (required) - The book title to search for
 *   exactMatch: boolean (optional) - Whether to require exact title match
 *   includeAllGenres: boolean (optional) - Whether to include all genres/categories
 * 
 * Response:
 *   {
 *     "title": string,
 *     "pages": number,
 *     "author": string | array,
 *     "genre": string | array,
 *     "source": string,
 *     "isbn": string,
 *     "publisher": string,
 *     "published": string,
 *     "language": string
 *   }
 */
app.get('/books/details', async (req, res) => {
  try {
    const { title, exactMatch = false, includeAllGenres = false } = req.query;
    
    if (!title) {
      return res.status(400).json({ error: 'Title query parameter is required' });
    }

    console.log('searching for title', title)

    // Search for books with the given title
    const books = await search(title, {
      searchResults: 1, // We only need the first result
      fetchAll: false
    });

    if (!books || books.length === 0) {
      return res.status(404).json({ error: 'No books found with that title' });
    }

    // If exact match is required, find a book with matching title
    let book;
    if (exactMatch) {
      book = books.find(b => b.title.toLowerCase() === title.toLowerCase());
      if (!book) {
        return res.status(404).json({ error: 'No exact title match found' });
      }
    } else {
      book = books[0]; // Take the first result
    }

    console.log("book ", book)

    // Prepare response object
    const response = {
      title: book.title,
      source: book.sources[0]?.name || 'Unknown',
      isbn: book.isbn,
      publisher: book.publisher || 'Unknown',
      published: book.published || 'Unknown',
      language: book.language || 'Unknown'
    };

    // Add pages if available
    if (book.pages) {
      response.pages = book.pages;
    }

    // Add author information
    if (book.authors && book.authors.length > 0) {
      response.author = book.authors.length === 1 ? book.authors[0] : book.authors;
    } else {
      response.author = 'Unknown';
    }

    // Add genre/category information
    if (book.categories && book.categories.length > 0) {
      response.genre = includeAllGenres ? book.categories : book.categories[0];
    } else {
      response.genre = 'Unknown';
    }

    // Return the successful response
    res.json(response);

    console.log("RESPONSE ", response.pages, response.author, response.genre)

  } catch (error) {
    console.error('Error fetching book details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;