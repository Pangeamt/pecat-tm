const postTranslationSchema = {
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
  };
  
  const getTranslationSchema = {
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
  };
  
  const patchTranslationSchema = {
    body: {
      type: "object",
      required: ["id"], // El ID es obligatorio para la actualización
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        project: { type: "string" },
        domain: { type: "string" },
      },
    },
  };
    
  const deleteTranslationSchema = {
    params: {
      type: "object",
      required: ["id"], // ID obligatorio para eliminar
      properties: {
        id: { type: "string" },
      },
    },
  };
  
  module.exports = { postTranslationSchema, getTranslationSchema, patchTranslationSchema, deleteTranslationSchema };
  