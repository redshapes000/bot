const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userId: String,
    displayName: String,
    wallet: { type: Number, default: 0 },
    bank: { type: Number, default: 0 },

    lastDaily: { type: Number, default: 0 },
    lastWork: { type: Number, default: 0 },
    lastRob: { type: Number, default: 0 },

    dailyStreak: { type: Number, default: 0 },

    inventory: { type: Array, default: [] }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

function resolveDisplayName(user, fallback) {
    return user?.displayName || user?.globalName || user?.username || fallback;
}

async function getUser(id, discordUser) {
    const displayName = resolveDisplayName(discordUser, id);
    let user = await User.findOne({ userId: id });

    if (!user) {
        user = await User.create({ userId: id, displayName });
    } else if (displayName && user.displayName !== displayName) {
        user.displayName = displayName;
        await user.save();
    }

    return user;
}

module.exports = { User, getUser };
