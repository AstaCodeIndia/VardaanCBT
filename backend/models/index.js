// backend/models/index.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcrypt');

// User Model
const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    validate: { isEmail: true }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true
  },
  googleId: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true
  },
  role: {
    type: DataTypes.ENUM('admin', 'student'),
    defaultValue: 'student',
    allowNull: false
  },
  profilePicture: {
    type: DataTypes.STRING,
    allowNull: true
  },
  level: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    validate: { min: 1, max: 100 }
  }
}, {
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password') && user.password) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    }
  }
});

User.prototype.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Test Model
const Test = sequelize.define('Test', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  conductDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  visibilityDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  isPublished: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  totalQuestions: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
});

// Question Model
const Question = sequelize.define('Question', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  testId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Tests',
      key: 'id'
    }
  },
  questionNumber: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  questionImageUrl: {
    type: DataTypes.STRING,
    allowNull: false
  },
  correctOption: {
    type: DataTypes.ENUM('A', 'B', 'C', 'D'),
    allowNull: true
  }
});

// Submission Model
const Submission = sequelize.define('Submission', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  testId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Tests',
      key: 'id'
    }
  },
  answers: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  },
  score: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  totalQuestions: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  correctAnswers: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  timeTaken: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  percentage: {
    type: DataTypes.FLOAT,
    allowNull: true
  }
});

// Relationships
Test.hasMany(Question, { foreignKey: 'testId', onDelete: 'CASCADE' });
Question.belongsTo(Test, { foreignKey: 'testId' });

User.hasMany(Submission, { foreignKey: 'userId', onDelete: 'CASCADE' });
Submission.belongsTo(User, { foreignKey: 'userId' });

Test.hasMany(Submission, { foreignKey: 'testId', onDelete: 'CASCADE' });
Submission.belongsTo(Test, { foreignKey: 'testId' });

module.exports = { User, Test, Question, Submission };