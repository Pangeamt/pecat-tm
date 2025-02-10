"use strict";
const client = require("../../db/connect");
const {
  postTranslationSchema, 
  getTranslationSchema, 
  patchTranslationSchema, 
  deleteTranslationSchema } = require("../../schemas/tm.schemas");

module.exports = async function (fastify, opts) {

  fastify.post("/",
    { schema: postTranslationSchema },
    async function (request, reply) {
      try {
        const { name, user, project, domain, source, target } = request.body;

        const doc = {
          name,
          context: { user, project, domain, source, target },
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

  fastify.get("/",
    { schema: getTranslationSchema },
    async function (request, reply) {
      try {
        const { name, user, project, domain, source, target, size = 100 } = request.query;

        const query = { bool: { must: [] } };
        const context = [];

        if (name) context.push({ term: { name: { value: name } } });
        if (user) context.push({ term: { "context.user": { value: user } } });
        if (project) context.push({ term: { "context.project": { value: project } } });
        if (domain) context.push({ term: { "context.domain": { value: domain } } });
        if (source) context.push({ term: { "context.source": { value: source } } });
        if (target) context.push({ term: { "context.target": { value: target } } });

        if (context.length) {
          context.forEach((clause) => {
            query.bool.must.push(clause);
          });
        }

        const { body } = await client.search({
          index: "translation_memory",
          body: { query },
          size: parseInt(size, 10), // Convierte `size` a número entero
        });

        const docs = body.hits.hits.map((hit) => {
          return {
            id: hit._id,
            ...hit._source,
          };
        });

        return reply.send({ total: body.hits.total.value, docs, });
      } catch (error) {
        return fastify.httpErrors.internalServerError(error.message);
      }
    }
  );

  fastify.patch("/",
    { schema: patchTranslationSchema },
    async function (request, reply) {
      try {
        const { id, name, project, domain } = request.body;

        const updateDoc = { doc: { context: {} } };

        if (name) updateDoc.doc.name = name;
        if (project) updateDoc.doc.context.project = project;
        if (domain) updateDoc.doc.context.domain = domain;

        if (!Object.keys(updateDoc.doc).length) {
          return reply.badRequest("No fields to update");
        }

        const { body } = await client.update({
          index: "translation_memory",
          id,
          body: updateDoc,
          refresh: "wait_for",
        });

        return reply.send({ message: "Updated successfully", result: body });
      } catch (error) {
        return fastify.httpErrors.internalServerError(error.message);
      }
    }
  );

  fastify.delete("/:id", 
    { schema: deleteTranslationSchema }, 
    async function (request, reply) {
      try {
        const { id } = request.params;

        const { body } = await client.delete({
          index: "translation_memory",
          id,
          refresh: "wait_for",
        });

        return reply.send({ message: "Deleted successfully", result: body });
      } catch (error) {
        if (error.meta?.statusCode === 404) { return reply.notFound("Document not found");}
        return fastify.httpErrors.internalServerError(error.message);
      }
    }
  );
  
};
