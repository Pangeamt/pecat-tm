"use strict";

const client = require("../../db/connect");

module.exports = async function (fastify, opts) {
  fastify.post(
    "/",
    {
      schema: {
        body: {
          type: "object",
          required: ["name", "user", "source", "target"],
          properties: {
            name: { type: "string" },
            user: { type: "string" },
            project: { type: "string" },
            domain: { type: "string" },
            source: { type: "string" },
            target: { type: "string" },
          },
        },
      },
    },
    async function (request, reply) {
      try {
        const {
          name,
          user,
          project = undefined,
          domain = undefined,
          source,
          target,
        } = request.body;

        const doc = {
          name,
          context: {
            user,
            project,
            domain,
            source,
            target,
          },
        };

        const { body } = await client.index({
          index: "translation_memory",
          body: doc,
        });

        return reply.send(body);
      } catch (error) {
        return fastify.httpErrors.internalServerError(error.message);
      }
    }
  );
  fastify.get(
    "/",
    {
      schema: {
        querystring: {
          type: "object",
          required: ["user"],
          properties: {
            name: { type: "string" },
            user: { type: "string" },
            project: { type: "string" },
            domain: { type: "string" },
            source: { type: "string" },
          },
        },
      },
    },
    async function (request, reply) {
      try {
        const { name, user, project, domain, source, target } = request.query;

        const query = {
          bool: {
            must: [],
          },
        };
        const context = [];

        if (name) {
          context.push({
            term: {
              name: {
                value: name,
              },
            },
          });
        }
        if (user) {
          context.push({
            term: {
              "context.user": {
                value: user,
              },
            },
          });
        }
        if (project) {
          context.push({
            term: {
              "context.project": {
                value: project,
              },
            },
          });
        }
        if (domain) {
          context.push({
            term: {
              "context.domain": {
                value: domain,
              },
            },
          });
        }
        if (source) {
          context.push({
            term: {
              "context.source": {
                value: source,
              },
            },
          });
        }
        if (target) {
          context.push({
            term: {
              "context.target": {
                value: target,
              },
            },
          });
        }
        if (context.length) {
          context.forEach((clause) => {
            query.bool.must.push(clause);
          });
        }
        const { body } = await client.search({
          index: "translation_memory",
          body: {
            query,
          },
        });
        const docs = body.hits.hits.map((hit) => {
          return {
            id: hit._id,
            ...hit._source,
          };
        });
        return reply.send({
          total: body.hits.total.value,
          docs,
        });
      } catch (error) {
        return fastify.httpErrors.internalServerError(error.message);
      }
    }
  );
};
