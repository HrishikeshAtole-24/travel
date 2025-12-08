Travel/
├── backend/
│   ├── src/
│   │    ├── app.js
│   │    ├── server.js
│   │    ├── config/
│   │    │    ├── database.js
│   │    │    ├── redis.js
│   │    │    ├── dotenv.js
│   │    │    ├── winstonLogger.js
│   │    │
│   │    ├── core/
│   │    │    ├── ApiResponse.js
│   │    │    ├── StatusCodes.js
│   │    │    ├── ApiError.js
│   │    │    ├── AsyncHandler.js            // Promise error wrapper
│   │    │
│   │    ├── routes/
│   │    │    ├── index.js                    // Combine all routes
│   │    │    └── flight.routes.js
│   │    │
│   │    ├── controllers/
│   │    │    └── flight.controller.js
│   │    │
│   │    ├── services/
│   │    │    └── flight.service.js
│   │    │
│   │    ├── repository/
│   │    │    ├── flight.repo.js              // DB queries only
│   │    │    └── cache.repo.js               // Redis caching layer
│   │    │
│   │    ├── suppliers/
│   │    │    ├── amadeus/
│   │    │    │    ├── amadeus.client.js      // axios/fetch wrapper (Token handle)
│   │    │    │    ├── amadeus.flight.js      // specific API calls
│   │    │    │    └── index.js                // export supplier methods
│   │    │    ├── supplierFactory.js           // select supplier dynamically
│   │    │
│   │    ├── assembly_line/
│   │    │    ├── mappers/
│   │    │    │    └── flight.mapper.js        // Map Amadeus → Standard JSON
│   │    │    ├── validators/
│   │    │    │    └── flight.validator.js     // Zod/Joi field validation
│   │    │    ├── transformers/
│   │    │    │    └── flight.transform.js     // Merge + normalize
│   │    │    └── index.js                     // Exports all assembly functions
│   │    │
│   │    ├── models/                           // DB Models (MySQL Sequelize/Knex)
│   │    │    ├── user.model.js
│   │    │    ├── booking.model.js
│   │    │    ├── traveler.model.js
│   │    │
│   │    ├── utils/
│   │    │    ├── httpClient.js                // axios instance base config
│   │    │    ├── DateUtils.js
│   │    │    ├── AirportUtils.js
│   │    │
│   │    └── middleware/
│   │         ├── error.middleware.js
│   │         ├── requestLogger.middleware.js
│   │         ├── auth.middleware.js
│   │
│   ├── package.json
│   ├── .env.example
│   ├── .gitignore
│   └── README.md
│
└── frontend/                          // Coming Soon
    ├── src/
    ├── package.json
    └── README.md
