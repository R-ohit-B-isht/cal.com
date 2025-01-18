db = db.getSiblingDB('devin_tasks');

// Create the tasks collection if it doesn't exist
if (!db.getCollection('tasks').exists()) {
    db.createCollection('tasks');
}

// Add schema validation
db.runCommand({
    collMod: 'tasks',
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['title', 'status', 'integration', 'createdAt'],
            properties: {
                title: {
                    bsonType: 'string',
                    description: 'must be a string and is required'
                },
                status: {
                    enum: ['To-Do', 'In-Progress', 'Done'],
                    description: 'must be one of the enum values and is required'
                },
                integration: {
                    enum: ['github', 'jira', 'linear'],
                    description: 'must be one of the enum values and is required'
                },
                createdAt: {
                    bsonType: 'date',
                    description: 'must be a date and is required'
                },
                description: {
                    bsonType: 'string',
                    description: 'optional task description'
                },
                updatedAt: {
                    bsonType: 'date',
                    description: 'optional last update timestamp'
                }
            }
        }
    }
});

// Create relationships collection if it doesn't exist
if (!db.getCollection('relationships').exists()) {
    db.createCollection('relationships');
}

// Add schema validation for relationships
db.runCommand({
    collMod: 'relationships',
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['sourceTaskId', 'targetTaskId', 'type', 'createdAt'],
            properties: {
                sourceTaskId: {
                    bsonType: 'string',
                    description: 'ID of the source task'
                },
                targetTaskId: {
                    bsonType: 'string',
                    description: 'ID of the target task'
                },
                type: {
                    enum: ['blocks', 'blocked-by', 'relates-to', 'duplicates', 'parent-of', 'child-of'],
                    description: 'Type of relationship between tasks'
                },
                createdAt: {
                    bsonType: 'date',
                    description: 'When the relationship was created'
                },
                updatedAt: {
                    bsonType: 'date',
                    description: 'When the relationship was last updated'
                }
            }
        }
    }
});

// Create indexes for faster querying
db.relationships.createIndex({ sourceTaskId: 1 });
db.relationships.createIndex({ targetTaskId: 1 });
db.relationships.createIndex({ type: 1 });

// Create mind map nodes collection
if (!db.getCollection('mindmap_nodes').exists()) {
    db.createCollection('mindmap_nodes');
}

// Add schema validation for mind map nodes
db.runCommand({
    collMod: 'mindmap_nodes',
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['label', 'position', 'createdAt'],
            properties: {
                label: {
                    bsonType: 'string',
                    description: 'must be a string and is required'
                },
                position: {
                    bsonType: 'object',
                    required: ['x', 'y'],
                    properties: {
                        x: {
                            bsonType: 'number',
                            description: 'x coordinate'
                        },
                        y: {
                            bsonType: 'number',
                            description: 'y coordinate'
                        }
                    }
                },
                createdAt: {
                    bsonType: 'date',
                    description: 'must be a date and is required'
                },
                updatedAt: {
                    bsonType: 'date',
                    description: 'optional last update timestamp'
                }
            }
        }
    }
});

// Create mind map edges collection
if (!db.getCollection('mindmap_edges').exists()) {
    db.createCollection('mindmap_edges');
}

// Add schema validation for mind map edges
db.runCommand({
    collMod: 'mindmap_edges',
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['sourceId', 'targetId', 'createdAt'],
            properties: {
                sourceId: {
                    bsonType: 'string',
                    description: 'ID of the source node'
                },
                targetId: {
                    bsonType: 'string',
                    description: 'ID of the target node'
                },
                createdAt: {
                    bsonType: 'date',
                    description: 'must be a date and is required'
                },
                updatedAt: {
                    bsonType: 'date',
                    description: 'optional last update timestamp'
                }
            }
        }
    }
});

// Create indexes for mind map collections
db.mindmap_nodes.createIndex({ label: 1 });
db.mindmap_edges.createIndex({ sourceId: 1 });
db.mindmap_edges.createIndex({ targetId: 1 });

// Verify collections exist
db.tasks.exists();
db.relationships.exists();
db.mindmap_nodes.exists();
db.mindmap_edges.exists();
