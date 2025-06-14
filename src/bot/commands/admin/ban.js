import {
	SlashCommandBuilder,
	PermissionFlagsBits,
	EmbedBuilder,
} from "discord.js";

export const data = new SlashCommandBuilder()
	.setName("ban")
	.setDescription("Ban a member from the server")
	.addUserOption((opt) =>
		opt.setName("user").setDescription("User to ban").setRequired(true),
	)
	.addStringOption((opt) =>
		opt.setName("reason").setDescription("Reason").setRequired(false),
	)
	.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);

export async function execute(interaction) {
	const user = interaction.options.getUser("user");
	const reason =
		interaction.options.getString("reason") || "No reason provided";
	let member;
	try {
		member = await interaction.guild.members.fetch(user.id);
	} catch {
		member = null;
	}

	// If the user is in the server
	if (member) {
		if (!member.bannable) {
			const embed = new EmbedBuilder()
				.setColor(0xe74c3c)
				.setTitle("Ban Failed")
				.setDescription("I can't ban this user.");
			return interaction.reply({ embeds: [embed], ephemeral: true });
		}
		await member.ban({ reason });
	} else {
		// User not in the server, ban by ID
		try {
			await interaction.guild.bans.create(user.id, { reason });
		} catch (err) {
			const embed = new EmbedBuilder()
				.setColor(0xe74c3c)
				.setTitle("Ban Failed")
				.setDescription("Failed to ban user. They may already be banned or the ID is invalid.");
			return interaction.reply({ embeds: [embed], ephemeral: true });
		}
	}

	const embed = new EmbedBuilder()
		.setColor(0xc0392b)
		.setTitle("User Banned")
		.addFields(
			{ name: "User", value: `${user.tag} (<@${user.id}>)`, inline: true },
			{ name: "Reason", value: reason, inline: true },
		)
		.setTimestamp();
	await interaction.reply({ embeds: [embed] });
}