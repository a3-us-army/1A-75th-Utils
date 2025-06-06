import {
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
  } from "discord.js";
  import {
    getApplication,
    approveApplication,
    denyApplication,
    getDatabase,
  } from "../utils/database.js";
  import fetchDiscordAvatar from "../../website/utils/fetchDiscordAvatar.js";
  
  const db = getDatabase();
  
  export async function handleApplicationButton(interaction) {
    // Approve: Show modal
    if (
      interaction.isButton() &&
      interaction.customId.startsWith("app_approve_")
    ) {
      const applicationId = interaction.customId.replace("app_approve_", "");
      const app = getApplication(applicationId);
      if (!app) {
        return interaction.reply({
          content: "Application not found.",
          ephemeral: true,
        });
      }
  
      // Show modal to collect squad, platoon, position, callsign
      const modal = new ModalBuilder()
        .setCustomId(`app_approve_modal_${applicationId}`)
        .setTitle("Assign Squad, Platoon, Position, Callsign");
  
      const squadInput = new TextInputBuilder()
        .setCustomId("squad")
        .setLabel("Squad")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
  
      const platoonInput = new TextInputBuilder()
        .setCustomId("platoon")
        .setLabel("Platoon")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
  
      const positionInput = new TextInputBuilder()
        .setCustomId("position")
        .setLabel("Position (optional)")
        .setStyle(TextInputStyle.Short)
        .setRequired(false);
  
      const callsignInput = new TextInputBuilder()
        .setCustomId("callsign")
        .setLabel("Callsign (optional)")
        .setStyle(TextInputStyle.Short)
        .setRequired(false);
  
      modal.addComponents(
        new ActionRowBuilder().addComponents(squadInput),
        new ActionRowBuilder().addComponents(platoonInput),
        new ActionRowBuilder().addComponents(positionInput),
        new ActionRowBuilder().addComponents(callsignInput)
      );
  
      return interaction.showModal(modal);
    }
  
    // Modal submit: approve and add to personnel
    if (
      interaction.isModalSubmit() &&
      interaction.customId.startsWith("app_approve_modal_")
    ) {
      const applicationId = interaction.customId.replace("app_approve_modal_", "");
      const app = getApplication(applicationId);
      if (!app) {
        return interaction.reply({
          content: "Application not found.",
          ephemeral: true,
        });
      }
  
      let squad = interaction.fields.getTextInputValue("squad").trim();
      let platoon = interaction.fields.getTextInputValue("platoon").trim();
      const position = interaction.fields.getTextInputValue("position").trim();
      const callsign = interaction.fields.getTextInputValue("callsign").trim();
  
      // Auto-prefix if only a number
      if (/^\d+$/.test(squad)) squad = `Squad ${squad}`;
      if (/^\d+$/.test(platoon)) platoon = `Platoon ${platoon}`;
  
      approveApplication(applicationId, interaction.user.id);
  
      // Find the current max sort_order for this squad+platoon
      const maxSortOrder = db.prepare(
        `SELECT MAX(sort_order) as max FROM personnel WHERE squad = ? AND platoon = ?`
      ).get(squad, platoon).max || 0;
  
      // Fetch avatar
      const botToken = process.env.DISCORD_TOKEN;
      const discord_avatar = await fetchDiscordAvatar(app.user_id, botToken);
  
      // Add to personnel database
      db.prepare(
        `
        INSERT INTO personnel
          (discord_id, discord_username, name, position, callsign, role, status, squad, platoon, discord_avatar, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      ).run(
        app.user_id,
        app.username,
        app.unit_name,
        position || null,
        callsign || null,
        app.mos || null,
        "Active",
        squad,
        platoon,
        discord_avatar,
        maxSortOrder + 1
      );
  
      const embed = new EmbedBuilder()
        .setTitle("Application Approved")
        .setColor(0x2ecc71)
        .addFields(
          { name: "Applicant", value: `<@${app.user_id}> (${app.username})`, inline: false },
          { name: "Squad", value: squad, inline: true },
          { name: "Platoon", value: platoon, inline: true },
          { name: "Position", value: position || "N/A", inline: true },
          { name: "Callsign", value: callsign || "N/A", inline: true },
          { name: "How did you find the unit?", value: app.found_unit, inline: false },
          { name: "Whats your steam64 ID?", value: app.steam64 || "N/A", inline: false },
          { name: "What name do you want?", value: app.unit_name || "N/A", inline: false },
          { name: "How old are you?", value: app.age ? app.age.toString() : "N/A", inline: true },
          { name: "List any prior experience?", value: app.experience || "None", inline: false },
          { name: "Whats your desired MOS/AFSC", value: app.mos || "N/A", inline: true },
          { name: "Status", value: "✅ Approved", inline: true },
          { name: "Approved By", value: `<@${interaction.user.id}>`, inline: true }
        )
        .setTimestamp();
  
      await interaction.update({ embeds: [embed], ephemeral: false });
  
      // DM the user
      try {
        const user = await interaction.client.users.fetch(app.user_id);
        await user.send(
          "Congratulations! Your application to the unit has been **approved**. Please check Discord for further instructions."
        );
      } catch (e) {
        console.error("Could not DM applicant:", e);
      }
      return;
    }
  
    // Deny
    if (interaction.customId.startsWith("app_deny_")) {
      const applicationId = interaction.customId.replace("app_deny_", "");
      const app = getApplication(applicationId);
      if (!app) {
        return interaction.reply({
          content: "Application not found.",
          ephemeral: true,
        });
      }
  
      denyApplication(applicationId, interaction.user.id, "Denied by admin");
  
      const embed = new EmbedBuilder()
        .setTitle("Application Denied")
        .setColor(0xe74c3c)
        .addFields(
          { name: "Applicant", value: `<@${app.user_id}> (${app.username})`, inline: false },
          { name: "How did you find the unit?", value: app.found_unit, inline: false },
          { name: "Whats your steam64 ID?", value: app.steam64, inline: false },
          { name: "What name do you want?", value: app.unit_name, inline: false },
          { name: "How old are you?", value: app.age ? app.age.toString() : "N/A", inline: true },
          { name: "List any prior experience?", value: app.experience || "None", inline: false },
          { name: "Whats your desired MOS/AFSC", value: app.mos || "N/A", inline: true },
          { name: "Status", value: "❌ Denied.", inline: true },
          { name: "Denied By", value: `<@${interaction.user.id}>`, inline: true }
        )
        .setTimestamp();
  
      await interaction.update({ embeds: [embed]});
  
      // DM the user
      try {
        const user = await interaction.client.users.fetch(app.user_id);
        await user.send(
          "We're sorry, but your application to the unit has been **denied**. Please contact an admin for more information."
        );
      } catch (e) {
        console.error("Could not DM applicant:", e);
      }
    }
  }