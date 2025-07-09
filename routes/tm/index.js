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

  fastify.get("/:id/export", async function (request, reply) {
    try {
      const { id } = request.params;
  
      // Buscar la TM por ID (usando búsqueda segura)
      const response = await client.search({
        index: "translation_memory",
        body: {
          query: {
            ids: {
              values: [id],
            },
          },
        },
      });
  
      const hits = response.body?.hits?.hits;
      if (!hits || hits.length === 0) {
        return reply.notFound("Translation memory not found");
      }
  
      const tm = {
        id,
        ...hits[0]._source,
      };
  
      // Buscar todas las TUs asociadas
      const tusResponse = await client.search({
        index: "translation_units",
        size: 10000,
        body: {
          query: {
            term: {
              translation_memory_id: {
                value: id,
              },
            },
          },
        },
      });
  
      const tusHits = tusResponse.body?.hits?.hits || [];
  
      const tus = tusHits.map((hit) => ({
        id: hit._id,
        ...hit._source,
      }));
  
      return reply.send({
        translation_memory: tm,
        units: tus,
      });
    } catch (error) {
      return fastify.httpErrors.internalServerError(error.message);
    }
  });

  fastify.post("/import", async function (request, reply) {
    try {
      const { translation_memory, units, tm } = request.body;
  
      if (!translation_memory || !Array.isArray(units))  return reply.badRequest("Invalid import structure");
      let finalTmId;

      if ( tm !== 0 ) finalTmId = tm;
      else{
          const tmId = translation_memory.id || undefined;

          const tmDoc = {
            name: translation_memory.name,
            context: translation_memory.context,
          };
      
          // Crear la TM (con ID opcional)
          const tmResponse = await client.index({
            index: "translation_memory",
            id: tmId,
            body: tmDoc,
            refresh: "wait_for",
          });

          finalTmId = tmResponse.body._id;
      }
  
      // Crear todas las unidades
      const bulkBody = units.flatMap((unit) => [
        { index: { _index: "translation_units" } },
        {
          ...unit,
          translation_memory_id: finalTmId,
          create_date: unit.create_date || new Date(),
          update_date: unit.update_date || new Date(),
        },
      ]);
  
      const bulkResponse = await client.bulk({
        refresh: "wait_for",
        body: bulkBody,
      });
  
      if (bulkResponse.body.errors) return reply.internalServerError("Some translation units failed to import");
  
      return reply.send({
        message: "TM and units imported successfully",
        translation_memory_id: finalTmId,
        units_imported: units.length,
      });
    } catch (error) {
      return reply.internalServerError(error.message);
    }
  });
  
  
};
