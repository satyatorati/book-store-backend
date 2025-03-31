const OpenAI = require('openai');
const Book = require('../books/book.model');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const ASSISTANT_ID = 'asst_u2e8nksz43YUOGV9iJW1cWWL';

// Store active threads
const activeThreads = new Map();

const handleChat = async (req, res) => {
    try {
        const { message, threadId } = req.body;
        let thread;

        if (threadId && activeThreads.has(threadId)) {
            thread = { id: threadId };
        } else {
            thread = await openai.beta.threads.create();
            activeThreads.set(thread.id, new Date());

            // Fetch books data
            const books = await Book.find({});
            const booksData = books.map(book => ({
                title: book.title,
                price: book.newPrice,
                category: book.category,
                description: book.description,
                author: book.author
            }));

            // Create a system message with instructions and book data
            const systemMessage = {
                role: "user",
                content: `You are a helpful bookstore assistant. Your role is to help customers find books, check prices, and get recommendations.

Here is our bookstore's catalog data that you can reference:
${JSON.stringify(booksData)}

Instructions:
1. Use the catalog data to provide accurate information about books
2. When recommending books, consider the category and price range
3. Be friendly and professional in your responses
4. Don't repeat the raw catalog data in your responses
5. Format your responses in a clear, readable way
6. If a book isn't in the catalog, politely say so

Remember: You are a helpful assistant that provides information about books from our catalog.`
            };

            await openai.beta.threads.messages.create(thread.id, systemMessage);
        }

        // Add the user's message
        await openai.beta.threads.messages.create(thread.id, {
            role: "user",
            content: message
        });

        // Run the assistant
        const run = await openai.beta.threads.runs.create(thread.id, {
            assistant_id: ASSISTANT_ID,
            model: "gpt-3.5-turbo"
        });

        // Wait for the run to complete
        let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        let attempts = 0;
        const maxAttempts = 30; // 30 seconds timeout
        const pollInterval = 1000; // 1 second

        while (attempts < maxAttempts) {
            if (runStatus.status === 'completed') {
                break;
            } else if (runStatus.status === 'failed') {
                throw new Error(`Assistant run failed: ${runStatus.last_error?.message || 'Unknown error'}`);
            } else if (runStatus.status === 'expired') {
                throw new Error('Assistant run expired');
            } else if (runStatus.status === 'cancelled') {
                throw new Error('Assistant run was cancelled');
            }

            await new Promise(resolve => setTimeout(resolve, pollInterval));
            runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
            attempts++;
        }

        if (attempts >= maxAttempts) {
            throw new Error('Assistant run timed out after 30 seconds');
        }

        // Get the assistant's response
        const messages = await openai.beta.threads.messages.list(thread.id);
        const lastMessage = messages.data[0];
        const response = lastMessage.content[0].text.value;

        // Clean up old threads (older than 1 hour)
        const now = new Date();
        for (const [threadId, timestamp] of activeThreads.entries()) {
            if (now - timestamp > 3600000) { // 1 hour
                try {
                    await openai.beta.threads.del(threadId);
                    activeThreads.delete(threadId);
                } catch (error) {
                    console.error('Error deleting old thread:', error);
                }
            }
        }

        res.status(200).json({
            message: response,
            threadId: thread.id
        });

    } catch (error) {
        console.error('Error in chat:', error);
        res.status(500).json({
            message: 'Sorry, I encountered an error. Please try again later.',
            error: error.message
        });
    }
};

module.exports = {
    handleChat
}; 