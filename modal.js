import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';

export const createModal = async (
  title,
  customId,
  textInputValue,
  textInputLabel,
  textInputPlaceholder,
  textInputCustomId
) => {
  // Create the modal
  const modal = new ModalBuilder().setCustomId(customId).setTitle(title);

  // Add components to modal

  const paragraphInput = new TextInputBuilder()
    .setCustomId(textInputCustomId)
    .setLabel(textInputLabel)
    .setValue(textInputValue)
    .setPlaceholder(textInputPlaceholder)
    .setMaxLength(1000)
    // Paragraph means multiple lines of text.
    .setStyle(TextInputStyle.Paragraph);

  // An action row only holds one text input,
  // so you need one action row per text input.
  const actionRow = new ActionRowBuilder().addComponents(paragraphInput);

  // Add inputs to the modal
  modal.addComponents(actionRow);

  return modal;
};
