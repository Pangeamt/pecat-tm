"use strict";

const client = require("../../db/connect");
const {
  levenshteinSimilarity,
  jaccardSimilarity,
} = require("../../utils/similarity");

module.exports = async function (fastify, opts) {
  fastify.get(
    "/",
    {
      schema: {
        querystring: {
          type: "object",
          required: [
            "translation_memory_id",
            "source_language",
            "target_language",
            "source_text",
          ],
          properties: {
            translation_memory_id: { type: "string" },
            source_language: { type: "string" },
            target_language: { type: "string" },
            source_text: { type: "string" },
            user: { type: "string" },
            project: { type: "string" },
            domain: { type: "string" },
            perTerm: { type: "boolean" },
          },
        },
      },
    },
    async function (request, reply) {
      try {
        const {
          translation_memory_id,
          source_language,
          target_language,
          source_text,
          user = undefined,
          project = undefined,
          domain = undefined,
          perTerm = false,
        } = request.query;

        const query = {
          bool: {
            must: [
              {
                term: {
                  translation_memory_id: {
                    value: translation_memory_id,
                  },
                },
              },
              {
                term: {
                  source_language: {
                    value: source_language,
                  },
                },
              },
              {
                term: {
                  target_language: {
                    value: target_language,
                  },
                },
              },
              {
                term: {
                  "context.user": {
                    value: user,
                  },
                },
              },
            ],
          },
        };

        if (perTerm && source_text) {
          query.bool.must.push({
            match_phrase: {
              source_text: source_text,
            },
          });
        } else {
          query.bool.must.push({
            match: {
              source_text: source_text,
            },
          });
        }

        const { body } = await client.search({
          index: "translation_units",
          explain: true,
          body: {
            query,
          },
        });

        const docs = [];
        body.hits.hits.map((hit) => {
          if (!perTerm) {
            const levenshteinSimilarityValue = levenshteinSimilarity(
              source_text,
              hit._source.source_text
            );
            const jaccardSimilarityValue = jaccardSimilarity(
              source_text,
              hit._source.source_text
            );

            if (
              levenshteinSimilarityValue >= 0.5 &&
              jaccardSimilarityValue >= 0.5
            ) {
              docs.push({
                id: hit._id,
                ...hit._source,
                similarity: {
                  levenshtein: levenshteinSimilarityValue,
                  jaccard: jaccardSimilarityValue,
                },
              });
            }
          } else {
            docs.push({
              id: hit._id,
              ...hit._source,
            });
          }
        });
        return reply.send({
          total: docs.length,
          docs,
        });
      } catch (error) {
        return fastify.httpErrors.internalServerError(error.message);
      }
    }
  );
  fastify.get(
    "/all",
    {
      schema: {
        querystring: {
          type: "object",
          required: ["translation_memory_id"],
          properties: {
            translation_memory_id: { type: "string" },
          },
        },
      },
    },
    async function (request, reply) {
      try {
        const { translation_memory_id } = request.query;

        const query = {
          bool: {
            must: [
              {
                term: {
                  translation_memory_id: {
                    value: translation_memory_id,
                  },
                },
              },
            ],
          },
        };

        const { body } = await client.search({
          index: "translation_units",
          explain: true,
          body: {
            query,
          },
        });

        const docs = [];
        body.hits.hits.map((hit) => {
          docs.push({
            id: hit._id,
            text: hit._source.source_text,
          });
        });
        return reply.send({
          total: docs.length,
          docs,
        });
      } catch (error) {
        return fastify.httpErrors.internalServerError(error.message);
      }
    }
  );
  fastify.post(
    "/",
    {
      schema: {
        body: {
          type: "object",
          required: [
            "translation_memory_id",
            "source_language",
            "target_language",
            "source_text",
            "translated_text",
          ],
          properties: {
            translation_memory_id: { type: "string" },
            source_language: { type: "string" },
            target_language: { type: "string" },
            source_text: { type: "string" },
            translated_text: { type: "string" },
            user: { type: "string" },
            project: { type: "string" },
            domain: { type: "string" },
          },
        },
      },
    },
    async function (request, reply) {
      try {
        const {
          translation_memory_id,
          source_language,
          target_language,
          source_text,
          translated_text,
          user = undefined,
          project = undefined,
          domain = undefined,
        } = request.body;

        const context = {
          user,
          project,
          domain,
        };

        // Check if the translation memory already exists
        let tm = null;
        try {
          tm = await client.get({
            index: "translation_memory",
            id: translation_memory_id,
          });
        } catch (error) {
          return fastify.httpErrors.conflict(
            `Translation memory with id ${translation_memory_id} does not exist.`
          );
        }
        if (!tm) {
          return fastify.httpErrors.conflict(
            `Translation memory with id ${translation_memory_id} does not exist.`
          );
        }

        const { body } = await client.index({
          index: "translation_units",
          body: {
            translation_memory_id,
            source_language,
            target_language,
            source_text,
            translated_text,
            context,
            create_date: new Date(),
            update_date: new Date(),
          },
        });

        return reply.send(body);
      } catch (error) {
        return fastify.httpErrors.internalServerError(error.message);
      }
    }
  );
  fastify.patch(
    "/",
    {
      schema: {
        body: {
          type: "object",
          required: [
            "translation_unit_id",
            "translation_memory_id",
            "source_language",
            "target_language",
            "source_text",
            "translated_text",
          ],
          properties: {
            translation_unit_id: { type: "string" },
            translation_memory_id: { type: "string" },
            source_language: { type: "string" },
            target_language: { type: "string" },
            source_text: { type: "string" },
            translated_text: { type: "string" },
            user: { type: "string" },
            project: { type: "string" },
            domain: { type: "string" },
          },
        },
      },
    },
    async function (request, reply) {
      try {
        const {
          translation_unit_id,
          translation_memory_id,
          source_language,
          target_language,
          source_text,
          translated_text,
          user = undefined,
          project = undefined,
          domain = undefined,
        } = request.body;

        const context = {
          user,
          project,
          domain,
        };

        // Check if the translation memory already exists
        let tm = null;
        let tu = null;
        try {
          tm = await client.get({
            index: "translation_memory",
            id: translation_memory_id,
          });
        } catch (error) {
          return fastify.httpErrors.conflict(
            `Translation memory with id ${translation_memory_id} does not exist.`
          );
        }
        if (!tm) {
          return fastify.httpErrors.conflict(
            `Translation memory with id ${translation_memory_id} does not exist.`
          );
        }

        try {
          tu = await client.get({
            index: "translation_units",
            id: translation_unit_id,
          });
        } catch (error) {
          return fastify.httpErrors.conflict(
            `Translation unit with id ${translation_unit_id} does not exist.`
          );
        }
        if (!tu) {
          return fastify.httpErrors.conflict(
            `Translation unit with id ${translation_unit_id} does not exist.`
          );
        }

        // Update the translation unit
        const { body } = await client.update({
          index: "translation_units",
          id: translation_unit_id,
          body: {
            doc: {
              translation_memory_id,
              source_language,
              target_language,
              source_text,
              translated_text,
              context,
              update_date: new Date(),
            },
          },
        });

        return reply.send(body);
      } catch (error) {
        return fastify.httpErrors.internalServerError(error.message);
      }
    }
  );
};
