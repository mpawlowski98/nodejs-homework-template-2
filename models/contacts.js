const Contact = require("./contacts.model");
const { nanoid } = require("nanoid");

const listContacts = async () => {
  return await Contact.find();
};

const getContactById = async (contactId) => {
  return await Contact.findById(contactId);
};
const removeContact = async (contactId) => {
  return await Contact.findByIdAndRemove(contactId);
};

const addContact = async (body) => {
  const newContact = { id: nanoid(), ...body };
  return await newContact.save();
};

const updateContact = async (contactId, body) => {
  return await Contact.findByIdAndUpdate(contactId, body, { new: true });
};

const contactFavorite = async (contactId, favorite) => {
  const contact = Contact.findById(contactId);
  if (!contact) {
    return null;
  }
  contact.favorite = favorite;
  return await contact.save();
};

module.exports = {
  listContacts,
  getContactById,
  removeContact,
  addContact,
  updateContact,
  contactFavorite,
};
