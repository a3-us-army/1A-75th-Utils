import {
	SlashCommandBuilder,
	PermissionFlagsBits,
	EmbedBuilder,
} from "discord.js";

export const data = new SlashCommandBuilder()
	.setName("kick")
	.setDescription("Kick a member from the server")
	.addUserOption((opt) =>
		opt.setName("user").setDescription("User to kick").setRequired(true),
	)
	.addStringOption((opt) =>
		opt.setName("reason").setDescription("Reason").setRequired(false),
	)
	.setDefaultMemberPermissions(PermissionFlagsBits.KickMembers);

export async function execute(interaction) {
	const user = interaction.options.getUser("user");
	const reason =
		interaction.options.getString("reason") || "No reason provided";
	const member = await interaction.guild.members
		.fetch(user.id)
		.catch(() => null);

	if (!member) {
		const embed = new EmbedBuilder()
			.setColor(0xe74c3c)
			.setTitle("Kick Failed")
			.setDescription("User not found.");
		return interaction.reply({ embeds: [embed], ephemeral: true });
	}
	if (!member.kickable) {
		const embed = new EmbedBuilder()
			.setColor(0xe74c3c)
			.setTitle("Kick Failed")
			.setDescription("I can't kick this user.");
		return interaction.reply({ embeds: [embed], ephemeral: true });
	}
	await member.kick(reason);
	const embed = new EmbedBuilder()
		.setColor(0xe67e22)
		.setTitle("User Kicked")
		.addFields(
			{ name: "User", value: `${user.tag} (<@${user.id}>)`, inline: true },
			{ name: "Reason", value: reason, inline: true },
		)
		.setTimestamp();
	await interaction.reply({ embeds: [embed] });
}