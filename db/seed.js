const client = require("../db/connect");

const indexes = [
  {
    name: "translation_memory",
    settings: {
      settings: {
        index: {
          number_of_shards: 4,
          number_of_replicas: 3,
        },
      },
    },
    mappings: {
      properties: {
        name: {
          type: "text",
          analyzer: "standard", // Considera personalizar según el idioma
        },
        create_date: {
          type: "date",
        },
        update_date: {
          type: "date",
        },
        context: {
          type: "object",
          properties: {
            user: {
              type: "keyword",
            },
            project: {
              type: "keyword",
            },
            domain: {
              type: "keyword",
            },
            source: {
              type: "keyword",
            },
            target: {
              type: "keyword",
            },
          },
        },
        metadata: {
          type: "object",
          enabled: false, // Los datos se almacenan, pero no se crean índices para los campos individuales dentro de metadata
        },
      },
    },
  },
  {
    name: "translation_units",
    settings: {
      settings: {
        index: {
          number_of_shards: 4,
          number_of_replicas: 3,
        },
      },
    },
    mappings: {
      properties: {
        translation_memory_id: {
          type: "keyword",
        },
        source_text: {
          type: "text",
          analyzer: "standard", // Considera personalizar según el idioma
        },
        translated_text: {
          type: "text",
          analyzer: "standard", // Considera personalizar según el idioma
        },
        source_language: {
          type: "keyword",
        },
        target_language: {
          type: "keyword",
        },
        create_date: {
          type: "date",
        },
        update_date: {
          type: "date",
        },
        context: {
          type: "object",
          properties: {
            user: {
              type: "keyword",
            },
            project: {
              type: "keyword",
            },
            domain: {
              type: "keyword",
            },
          },
        },
        metadata: {
          type: "object",
          enabled: false, // Los datos se almacenan, pero no se crean índices para los campos individuales dentro de metadata
        },
      },
    },
  },
];

const seed = async () => {
  // START: Seed indexes
  console.log("Seeding indexes...! 🚀");
  for (const index of indexes) {
    try {
      await client.indices.create({
        index: index.name,
        body: index.settings,
      });
      await client.indices.putMapping({
        index: index.name,
        body: index.mappings,
      });
    } catch (error) {
      console.error(error);
    }
  }
  console.log("Indexes seeded! 🌱");
};

seed();
