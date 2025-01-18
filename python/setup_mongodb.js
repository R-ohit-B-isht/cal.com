db = db.getSiblingDB('devin_tasks');

// Create monitoring_sessions collection
if (!db.getCollection('monitoring_sessions').exists()) {
    db.createCollection('monitoring_sessions');
}

// Add schema validation for monitoring_sessions
db.runCommand({
    collMod: 'monitoring_sessions',
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['engineerId', 'startTime', 'status'],
            properties: {
                engineerId: {
                    bsonType: 'string',
                    description: 'ID of the engineer being monitored'
                },
                startTime: {
                    bsonType: 'date',
                    description: 'When the monitoring session started'
                },
                endTime: {
                    bsonType: 'date',
                    description: 'When the monitoring session ended'
                },
                status: {
                    enum: ['running', 'stopped', 'idle'],
                    description: 'Current status of the monitoring session'
                },
                focusTime: {
                    bsonType: 'int',
                    description: 'Time spent focused on core tasks (in seconds)'
                },
                idleTime: {
                    bsonType: 'int',
                    description: 'Time spent idle (in seconds)'
                },
                productivityScore: {
                    bsonType: 'double',
                    minimum: 0,
                    maximum: 100,
                    description: 'Productivity score for this session'
                }
            }
        }
    }
});

// Create activity_events collection
if (!db.getCollection('activity_events').exists()) {
    db.createCollection('activity_events');
}

// Add schema validation for activity_events
db.runCommand({
    collMod: 'activity_events',
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['engineerId', 'sessionId', 'timestamp', 'eventType'],
            properties: {
                engineerId: {
                    bsonType: 'string',
                    description: 'ID of the engineer'
                },
                sessionId: {
                    bsonType: 'string',
                    description: 'ID of the monitoring session'
                },
                timestamp: {
                    bsonType: 'date',
                    description: 'When the event occurred'
                },
                eventType: {
                    enum: ['keyboard', 'mouse', 'ide', 'terminal', 'meeting', 'break'],
                    description: 'Type of activity event'
                },
                metadata: {
                    bsonType: 'object',
                    description: 'Additional event metadata'
                },
                screenshotUrl: {
                    bsonType: 'string',
                    description: 'Optional URL to activity screenshot'
                }
            }
        }
    }
});

// Create achievements collection
if (!db.getCollection('achievements').exists()) {
    db.createCollection('achievements');
}

// Add schema validation for achievements
db.runCommand({
    collMod: 'achievements',
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['engineerId', 'badge', 'earnedAt'],
            properties: {
                engineerId: {
                    bsonType: 'string',
                    description: 'ID of the engineer'
                },
                badge: {
                    enum: ['Daily Goal', 'Focus Master', 'Code Warrior', 'Team Player', 'Early Bird'],
                    description: 'Type of achievement badge'
                },
                earnedAt: {
                    bsonType: 'date',
                    description: 'When the badge was earned'
                },
                metadata: {
                    bsonType: 'object',
                    description: 'Additional achievement metadata'
                }
            }
        }
    }
});

// Create schedule_limits collection
if (!db.getCollection('schedule_limits').exists()) {
    db.createCollection('schedule_limits');
}

// Add schema validation for schedule_limits
db.runCommand({
    collMod: 'schedule_limits',
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['engineerId', 'dailyHourLimit', 'weeklyHourLimit'],
            properties: {
                engineerId: {
                    bsonType: 'string',
                    description: 'ID of the engineer'
                },
                dailyHourLimit: {
                    bsonType: 'int',
                    minimum: 1,
                    maximum: 24,
                    description: 'Maximum hours per day'
                },
                weeklyHourLimit: {
                    bsonType: 'int',
                    minimum: 1,
                    maximum: 168,
                    description: 'Maximum hours per week'
                },
                alertThreshold: {
                    bsonType: 'int',
                    minimum: 1,
                    maximum: 100,
                    description: 'Percentage threshold for alerts'
                }
            }
        }
    }
});

// Create monitoring_alerts collection
if (!db.getCollection('monitoring_alerts').exists()) {
    db.createCollection('monitoring_alerts');
}

// Add schema validation for monitoring_alerts
db.runCommand({
    collMod: 'monitoring_alerts',
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['engineerId', 'type', 'message', 'percentage', 'createdAt'],
            properties: {
                engineerId: {
                    bsonType: 'string',
                    description: 'ID of the engineer'
                },
                type: {
                    enum: ['daily_limit', 'weekly_limit'],
                    description: 'Type of alert'
                },
                message: {
                    bsonType: 'string',
                    description: 'Alert message'
                },
                percentage: {
                    bsonType: 'double',
                    minimum: 0,
                    maximum: 100,
                    description: 'Usage percentage that triggered the alert'
                },
                createdAt: {
                    bsonType: 'date',
                    description: 'When the alert was generated'
                },
                readAt: {
                    bsonType: 'date',
                    description: 'When the alert was read by the user'
                }
            }
        }
    }
});

// Create leaderboard collection
if (!db.getCollection('leaderboard').exists()) {
    db.createCollection('leaderboard');
}

// Add schema validation for leaderboard
db.runCommand({
    collMod: 'leaderboard',
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['type', 'date', 'rankings'],
            properties: {
                type: {
                    enum: ['daily_coding_time', 'weekly_coding_time', 'monthly_coding_time'],
                    description: 'Type of leaderboard'
                },
                date: {
                    bsonType: 'date',
                    description: 'Date of the leaderboard'
                },
                rankings: {
                    bsonType: 'array',
                    items: {
                        bsonType: 'object',
                        required: ['engineerId', 'codingTime', 'focusScore'],
                        properties: {
                            engineerId: {
                                bsonType: 'string',
                                description: 'ID of the engineer'
                            },
                            codingTime: {
                                bsonType: 'int',
                                description: 'Total coding time in seconds'
                            },
                            focusScore: {
                                bsonType: 'double',
                                minimum: 0,
                                maximum: 100,
                                description: 'Focus score percentage'
                            },
                            achievements: {
                                bsonType: 'array',
                                items: {
                                    bsonType: 'string'
                                },
                                description: 'List of achievements earned during this period'
                            }
                        }
                    }
                }
            }
        }
    }
});

// Create personal_bests collection
if (!db.getCollection('personal_bests').exists()) {
    db.createCollection('personal_bests');
}

// Add schema validation for personal_bests
db.runCommand({
    collMod: 'personal_bests',
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['engineerId', 'metrics'],
            properties: {
                engineerId: {
                    bsonType: 'string',
                    description: 'ID of the engineer'
                },
                metrics: {
                    bsonType: 'object',
                    required: ['dailyCodingTime', 'weeklyFocusScore', 'longestFocusStreak'],
                    properties: {
                        dailyCodingTime: {
                            bsonType: 'int',
                            description: 'Best daily coding time in seconds'
                        },
                        weeklyFocusScore: {
                            bsonType: 'double',
                            minimum: 0,
                            maximum: 100,
                            description: 'Best weekly focus score'
                        },
                        longestFocusStreak: {
                            bsonType: 'int',
                            description: 'Longest continuous focus time in seconds'
                        }
                    }
                },
                lastUpdated: {
                    bsonType: 'date',
                    description: 'When these records were last updated'
                }
            }
        }
    }
});

// Create indexes for monitoring collections
db.monitoring_sessions.createIndex({ engineerId: 1, startTime: -1 });
db.monitoring_sessions.createIndex({ status: 1 });
db.activity_events.createIndex({ engineerId: 1, sessionId: 1, timestamp: -1 });
db.activity_events.createIndex({ eventType: 1 });
db.achievements.createIndex({ engineerId: 1, badge: 1 });
db.schedule_limits.createIndex({ engineerId: 1 });

// Create indexes for leaderboard collections
db.leaderboard.createIndex({ type: 1, date: -1 });
db.leaderboard.createIndex({ "rankings.engineerId": 1 });
db.personal_bests.createIndex({ engineerId: 1 });
db.monitoring_alerts.createIndex({ engineerId: 1, createdAt: -1 });
db.monitoring_alerts.createIndex({ type: 1 });
db.monitoring_alerts.createIndex({ readAt: 1 });

// Verify collections exist
print('Verifying collections...');
print('monitoring_sessions exists:', db.monitoring_sessions.exists());
print('activity_events exists:', db.activity_events.exists());
print('achievements exists:', db.achievements.exists());
print('schedule_limits exists:', db.schedule_limits.exists());
