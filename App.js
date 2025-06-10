import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
  Platform,
  Dimensions,
  Animated,
} from 'react-native';
import { FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts, PlayfairDisplay_600SemiBold } from '@expo-google-fonts/playfair-display';
import { Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import { LinearGradient } from 'expo-linear-gradient';

// --- Theme and Constants (from the main app) ---
const COLORS = {
  bgMain: '#FDF7FA',
  bgCard: '#FFFFFF',
  textPrimary: '#4E3D52',
  textSecondary: '#8A798D',
  textOnAccent: '#FFFFFF',
  accentPrimary: '#EF9A9A',
  accentPrimaryDarker: '#E57373',
  accentSecondary: '#CE93D8',
  borderColor: '#F3EAF5',
  shadowColor: 'rgba(149, 117, 205, 0.3)',
};

// --- Expanded color palette for notes ---
const NOTE_COLORS = [
    '#F3E5F5', // Light Purple
    '#E1F5FE', // Light Blue
    '#E8F5E9', // Light Green
    '#FFFDE7', // Light Yellow
    '#FBE9E7', // Light Peach
];

const FONT_FAMILY = {
  playfair: 'PlayfairDisplay_600SemiBold',
  poppins: 'Poppins_400Regular',
  poppinsMedium: 'Poppins_500Medium',
  poppinsBold: 'Poppins_600SemiBold',
};

// --- Helper: Checklist Item ---
const ChecklistItem = ({ item, onToggle, isEditing, onTextChange, onAddItem, onDeleteItem }) => {
    return (
        <View style={styles.checklistItem}>
            {!isEditing && (
                <TouchableOpacity onPress={onToggle} style={styles.checkbox}>
                    {item.isChecked && <FontAwesome5 name="check" size={12} color={COLORS.textSecondary} />}
                </TouchableOpacity>
            )}
            <TextInput
                value={item.text}
                onChangeText={onTextChange}
                placeholder="List item"
                placeholderTextColor={COLORS.textSecondary}
                style={[styles.checklistItemText, item.isChecked && !isEditing && styles.checklistItemTextChecked]}
                editable={isEditing}
                onSubmitEditing={onAddItem} // Add new item when user presses enter
            />
            {isEditing && (
                <TouchableOpacity onPress={onDeleteItem} style={styles.deleteItemButton}>
                    <FontAwesome5 name="times" size={16} color={COLORS.textSecondary} />
                </TouchableOpacity>
            )}
        </View>
    );
};


// --- Note Viewer Modal ---
const NoteViewerModal = ({isVisible, note, color, onClose, onEdit, onDelete, onToggleFavorite, onTogglePrivate}) => {
    if (!note) return null;
    return(
        <Modal visible={isVisible} animationType="slide" onRequestClose={onClose}>
            <SafeAreaView style={[styles.viewerSafeArea, {backgroundColor: color || COLORS.bgMain}]}>
               <View style={styles.viewerHeader}>
                    <TouchableOpacity onPress={onClose} style={styles.viewerButton}>
                        <FontAwesome5 name="chevron-left" size={20} color={COLORS.textPrimary}/>
                    </TouchableOpacity>
                    <View style={styles.viewerHeaderActions}>
                        <TouchableOpacity onPress={() => onTogglePrivate(note.id)} style={styles.viewerButton}>
                           <FontAwesome5 name={note.isPrivate ? "lock" : "lock-open"} size={20} color={COLORS.textPrimary} />
                       </TouchableOpacity>
                        <TouchableOpacity onPress={() => onToggleFavorite(note.id)} style={styles.viewerButton}>
                           <FontAwesome name={note.isFavorite ? "star" : "star-o"} size={22} color={COLORS.accentPrimaryDarker} />
                       </TouchableOpacity>
                       <TouchableOpacity onPress={() => onEdit(note, color)} style={styles.viewerButton}>
                           <FontAwesome5 name="pen" size={20} color={COLORS.textPrimary}/>
                       </TouchableOpacity>
                       <TouchableOpacity onPress={() => onDelete(note.id)} style={styles.viewerButton}>
                           <FontAwesome5 name="trash" size={20} color={COLORS.textPrimary}/>
                       </TouchableOpacity>
                    </View>
               </View>
               <ScrollView contentContainerStyle={styles.viewerContentContainer}>
                  <Text style={styles.viewerTitle}>{note.title || "Note"}</Text>
                  <Text style={styles.viewerDate}>Last updated: {new Date(note.date).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
                  
                  {note.type === 'checklist' ? (
                     (note.content || []).map(item => (
                         <ChecklistItem key={item.id} item={item} isEditing={false} onToggle={() => { /* Non-functional in viewer */ }} />
                     ))
                  ) : (
                     <Text style={styles.viewerContent}>{note.content}</Text>
                  )}
               </ScrollView>
            </SafeAreaView>
        </Modal>
    );
}

// --- Note Editor Modal ---
const NoteEditorModal = ({ isVisible, onClose, onSave, editingData }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [checklistItems, setChecklistItems] = useState([]);
    const [currentNoteType, setCurrentNoteType] = useState('text');
    const [isPrivate, setIsPrivate] = useState(false);

    const editingNote = editingData?.note;
    const noteColor = editingData?.color;

    useEffect(() => {
        if (isVisible) {
            const initialType = editingNote ? editingNote.type : 'text';
            setCurrentNoteType(initialType);
            setTitle(editingNote ? editingNote.title : '');
            setIsPrivate(editingNote ? editingNote.isPrivate : false);

            if (initialType === 'checklist') {
                setContent('');
                setChecklistItems(editingNote && Array.isArray(editingNote.content) ? editingNote.content : [{id: Date.now(), text: '', isChecked: false}]);
            } else {
                setContent(editingNote ? editingNote.content : '');
                setChecklistItems([]);
            }
        }
    }, [editingData, isVisible]);


    const handleSave = () => {
        const finalContent = currentNoteType === 'checklist' ? checklistItems.filter(item => item.text.trim() !== '') : content;
        onSave(title, finalContent, currentNoteType, isPrivate);
        onClose();
    };
    
    const canSave = title.trim().length > 0 || (currentNoteType === 'text' ? content.trim().length > 0 : checklistItems.some(item => item.text.trim() !== ''));

    const handleChecklistTextChange = (id, text) => {
        setChecklistItems(items => items.map(item => item.id === id ? {...item, text} : item));
    }

    const handleAddChecklistItem = () => {
        setChecklistItems(items => [...items, {id: Date.now(), text: '', isChecked: false}]);
    }
    
    const handleDeleteChecklistItem = (id) => {
        setChecklistItems(items => items.filter(item => item.id !== id));
    }
    
    const toggleNoteType = () => {
        setCurrentNoteType(prev => prev === 'text' ? 'checklist' : 'text');
    }

    return (
        <Modal visible={isVisible} animationType="slide" onRequestClose={onClose}>
            <SafeAreaView style={[styles.editorSafeArea, { backgroundColor: noteColor || COLORS.bgMain }]}>
                <View style={styles.editorHeader}>
                    <TouchableOpacity onPress={onClose} style={styles.viewerButton}>
                         <Text style={styles.editorHeaderText}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.editorTitle}>{editingNote ? "Edit Note" : "Create Note"}</Text>
                    <TouchableOpacity onPress={handleSave} disabled={!canSave} style={styles.viewerButton}>
                         <Text style={[styles.editorHeaderText, styles.editorSaveButton, !canSave && styles.editorSaveButtonDisabled]}>Save</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.editorContentContainer}>
                    <TextInput 
                        placeholder="Title" 
                        value={title} 
                        onChangeText={setTitle} 
                        style={styles.editorTitleInput}
                        placeholderTextColor={COLORS.textSecondary}
                        multiline={true}
                    />
                     {currentNoteType === 'checklist' ? (
                        <ScrollView>
                            {checklistItems.map((item, index) => (
                                <ChecklistItem 
                                    key={item.id}
                                    item={item}
                                    isEditing={true}
                                    onTextChange={(text) => handleChecklistTextChange(item.id, text)}
                                    onAddItem={index === checklistItems.length - 1 ? handleAddChecklistItem : () => {}}
                                    onDeleteItem={() => handleDeleteChecklistItem(item.id)}
                                />
                            ))}
                            <TouchableOpacity onPress={handleAddChecklistItem} style={styles.addChecklistItem}>
                                <FontAwesome5 name="plus" size={14} color={COLORS.textSecondary} />
                                <Text style={styles.addChecklistItemText}>Add Item</Text>
                            </TouchableOpacity>
                        </ScrollView>
                     ) : (
                        <TextInput 
                            placeholder="Your thoughts here..."
                            value={content}
                            onChangeText={setContent}
                            multiline
                            style={styles.editorContentInput}
                            placeholderTextColor={COLORS.textSecondary}
                        />
                     )}
                </View>
                <View style={[styles.editorToolbar, { backgroundColor: noteColor || COLORS.bgMain }]}>
                    <TouchableOpacity onPress={toggleNoteType} style={styles.toolbarButton}>
                       <FontAwesome5 name={currentNoteType === 'checklist' ? 'font' : 'check-square'} size={22} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setIsPrivate(!isPrivate)} style={styles.toolbarButton}>
                       <FontAwesome5 name={isPrivate ? 'lock' : 'lock-open'} size={22} color={isPrivate ? COLORS.accentPrimaryDarker : COLORS.textPrimary} />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </Modal>
    );
};

// --- Custom Confirmation Modal ---
const CustomAlertModal = ({ isVisible, onClose, onConfirm, title, message }) => (
    <Modal visible={isVisible} transparent={true} animationType="fade" onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
            <View style={styles.alertContainer}>
                <Text style={styles.alertTitle}>{title}</Text>
                <Text style={styles.alertMessage}>{message}</Text>
                <View style={styles.alertButtonContainer}>
                    <TouchableOpacity style={[styles.alertButton, styles.alertButtonCancel]} onPress={onClose}>
                        <Text style={styles.alertButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.alertButton, styles.alertButtonConfirm]} onPress={onConfirm}>
                        <Text style={[styles.alertButtonText, {color: 'white'}]}>Delete</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    </Modal>
);

// --- FAB Menu Component ---
const FabMenu = ({ onSelect }) => {
    return (
        <View style={styles.fabContainer}>
            <TouchableOpacity style={styles.fabOption} onPress={() => onSelect('text')}>
                <Text style={styles.fabLabel}>Text</Text>
                <View style={styles.fabIconContainer}>
                    <FontAwesome5 name="font" size={18} color="white" />
                </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.fabOption} onPress={() => onSelect('checklist')}>
                <Text style={styles.fabLabel}>List</Text>
                <View style={styles.fabIconContainer}>
                    <FontAwesome5 name="check-square" size={18} color="white" />
                </View>
            </TouchableOpacity>
        </View>
    )
}

// --- Standalone Notepad Screen ---
export default function NotepadScreen() {
    const [fontsLoaded] = useFonts({ PlayfairDisplay_600SemiBold, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold });
    const [notes, setNotes] = useState([]);
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    
    const [isEditorVisible, setEditorVisible] = useState(false);
    const [isViewerVisible, setViewerVisible] = useState(false);
    
    const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
    const [noteToDelete, setNoteToDelete] = useState(null);
    const [isFabMenuVisible, setFabMenuVisible] = useState(false);

    const [editingData, setEditingData] = useState(null); // { note, color }
    const [viewingData, setViewingData] = useState(null); // { note, color }
    
    const STORAGE_KEY = '@AminaAura:notes_v4';

    useEffect(() => { loadNotes() }, []);

    const loadNotes = async () => { try { const jsonValue = await AsyncStorage.getItem(STORAGE_KEY); if (jsonValue !== null) setNotes(JSON.parse(jsonValue)) } catch (e) { console.error("Failed to load notes.", e) } };
    const saveNotes = async (newNotes) => { try { const jsonValue = JSON.stringify(newNotes); await AsyncStorage.setItem(STORAGE_KEY, jsonValue); setNotes(newNotes) } catch (e) { console.error("Failed to save notes.", e) } };
    
    const handleSaveNote = (title, content, type, isPrivate) => {
        let newNotes;
        const editingNote = editingData?.note;
        if (editingNote) { 
            newNotes = notes.map(note => note.id === editingNote.id ? { ...note, title, content, type, isPrivate, date: new Date().toISOString() } : note);
        } else { 
            newNotes = [{ id: Date.now().toString(), title, content, type, isPrivate, date: new Date().toISOString(), isFavorite: false }, ...notes];
        }
        saveNotes(newNotes);
        setEditingData(null);
    };

    const confirmDeleteNote = (id) => { 
        setNoteToDelete(id);
        setViewerVisible(false);
        setDeleteModalVisible(true);
    };
    
    const executeDelete = () => {
        const newNotes = notes.filter(note => note.id !== noteToDelete);
        saveNotes(newNotes);
        setDeleteModalVisible(false);
        setNoteToDelete(null);
    }
    
    const handleToggleFavorite = (id) => { 
        const newNotes = notes.map(note => note.id === id ? { ...note, isFavorite: !note.isFavorite } : note);
        saveNotes(newNotes);
        if (viewingData?.note.id === id) {
            setViewingData(prev => ({...prev, note: {...prev.note, isFavorite: !prev.note.isFavorite}}));
        }
    };
    
    const handleTogglePrivate = (id) => {
         const newNotes = notes.map(note => note.id === id ? { ...note, isPrivate: !note.isPrivate } : note);
        saveNotes(newNotes);
        if (viewingData?.note.id === id) {
            setViewingData(prev => ({...prev, note: {...prev.note, isPrivate: !prev.note.isPrivate}}));
        }
    };
    
    const handleOpenEditor = (note = null, color = null, type = 'text') => {
        setEditingData({note, color});
        setViewerVisible(false); 
        setEditorVisible(true);
    }
    
    const handleCreateNote = (type) => {
        setFabMenuVisible(false);
        // Open editor for a new note, no pre-existing color
        handleOpenEditor(null, null, type);
    };
    
    const handleOpenViewer = (note, color) => {
        setViewingData({note, color});
        setViewerVisible(true);
    }
    
    const handleToggleChecklistItem = (noteId, itemId) => {
        const newNotes = notes.map(note => {
            if (note.id === noteId && note.type === 'checklist') {
                const newContent = note.content.map(item => 
                    item.id === itemId ? {...item, isChecked: !item.isChecked} : item
                );
                return {...note, content: newContent};
            }
            return note;
        });
        saveNotes(newNotes);
    };

    const notesToDisplay = useMemo(() => {
        let filteredNotes = notes;
        if (showFavoritesOnly) {
            filteredNotes = filteredNotes.filter(n => n.isFavorite);
        }
        if (searchQuery.trim() !== '') {
            const lowercasedQuery = searchQuery.toLowerCase();
            filteredNotes = filteredNotes.filter(n => 
                n.title.toLowerCase().includes(lowercasedQuery) ||
                (typeof n.content === 'string' && n.content.toLowerCase().includes(lowercasedQuery))
            );
        }
        return filteredNotes;
    }, [notes, showFavoritesOnly, searchQuery]);

    const renderNote = ({ item, colorIndex }) => {
        const cardColor = NOTE_COLORS[colorIndex % NOTE_COLORS.length];
        return(
            <TouchableOpacity style={styles.noteCardContainer} onPress={() => handleOpenViewer(item, cardColor)}>
                <View style={[styles.noteCard, {backgroundColor: cardColor}]}>
                    <TouchableOpacity style={styles.favoriteIcon} onPress={(e) => { e.stopPropagation(); handleToggleFavorite(item.id); }}>
                        <FontAwesome name={item.isFavorite ? "star" : "star-o"} size={18} color={COLORS.accentPrimaryDarker} />
                    </TouchableOpacity>
                    <Text style={styles.noteTitle} numberOfLines={2}>{item.title || "Untitled Note"}</Text>
                    
                    {item.isPrivate ? (
                        <View style={styles.privateNoteOverlay}>
                            <FontAwesome5 name="lock" size={24} color={COLORS.textSecondary} />
                        </View>
                    ) : (
                        item.type === 'checklist' ? (
                            <View>
                                {(item.content || []).slice(0, 4).map(checkItem => (
                                    <ChecklistItem key={checkItem.id} item={checkItem} isEditing={false} onToggle={(e) => { e.stopPropagation(); handleToggleChecklistItem(item.id, checkItem.id)}} />
                                ))}
                            </View>
                        ) : (
                           <Text style={styles.noteContent} numberOfLines={5}>{item.content}</Text>
                        )
                    )}
                    <Text style={styles.noteDate}>{new Date(item.date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
            </TouchableOpacity>
        );
    }
    
    if (!fontsLoaded) {
        return <View style={styles.fullScreenLoader}><ActivityIndicator size="large" color={COLORS.accentPrimary}/></View>;
    }
    
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                 <Text style={styles.headerTitle}>My Notes</Text>
            </View>
            <View style={styles.controlsContainer}>
                <View style={styles.searchContainer}>
                    <FontAwesome5 name="search" size={14} color={COLORS.textSecondary} style={styles.searchIcon} />
                    <TextInput
                        placeholder="Search notes..."
                        placeholderTextColor={COLORS.textSecondary}
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
                <View style={styles.filterContainer}>
                     <TouchableOpacity onPress={() => setShowFavoritesOnly(false)} style={[styles.filterButton, !showFavoritesOnly && styles.filterButtonActive]}>
                        <Text style={[styles.filterButtonText, !showFavoritesOnly && styles.filterButtonTextActive]}>All</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowFavoritesOnly(true)} style={[styles.filterButton, showFavoritesOnly && styles.filterButtonActive]}>
                        <Text style={[styles.filterButtonText, showFavoritesOnly && styles.filterButtonTextActive]}>Favorites</Text>
                    </TouchableOpacity>
                </View>
            </View>
            
            <View style={{flex: 1}}>
                {notesToDisplay.length > 0 ? (
                    <ScrollView contentContainerStyle={styles.notesGrid}>
                        <View style={styles.column}>
                            {notesToDisplay.filter((_, i) => i % 2 === 0).map((item, index) => renderNote({item, colorIndex: index}))}
                        </View>
                        <View style={styles.column}>
                            {notesToDisplay.filter((_, i) => i % 2 !== 0).map((item, index) => renderNote({item, colorIndex: index + 1}))}
                        </View>
                    </ScrollView>
                ) : (
                    <View style={styles.emptyListContainer}>
                       <FontAwesome5 name="sticky-note" size={48} color={COLORS.accentSecondary} />
                       <Text style={styles.emptyListText}>{searchQuery ? 'No notes match your search.' : (showFavoritesOnly ? "You have no favorite notes." : "Create your first note!")}</Text>
                    </View>
                )}
            </View>

            {isFabMenuVisible && (
                <TouchableWithoutFeedback onPress={() => setFabMenuVisible(false)}>
                    <View style={styles.fabOverlay}>
                        <FabMenu onSelect={handleCreateNote} />
                    </View>
                </TouchableWithoutFeedback>
            )}

            <TouchableOpacity style={styles.createButton} onPress={() => setFabMenuVisible(!isFabMenuVisible)}>
                <LinearGradient colors={[COLORS.accentSecondary, COLORS.accentPrimary]} style={styles.createButtonGradient}>
                     <FontAwesome5 name={isFabMenuVisible ? "times" : "plus"} size={20} color="white" />
                </LinearGradient>
            </TouchableOpacity>

            <NoteEditorModal 
                isVisible={isEditorVisible}
                onClose={() => setEditorVisible(false)}
                onSave={handleSaveNote}
                editingData={editingData}
            />
            
            <NoteViewerModal
                isVisible={isViewerVisible}
                note={viewingData?.note}
                color={viewingData?.color}
                onClose={() => setViewerVisible(false)}
                onEdit={handleOpenEditor}
                onDelete={confirmDeleteNote}
                onToggleFavorite={handleToggleFavorite}
                onTogglePrivate={handleTogglePrivate}
            />

            <CustomAlertModal 
                isVisible={isDeleteModalVisible}
                onClose={() => setDeleteModalVisible(false)}
                onConfirm={executeDelete}
                title="Delete Note"
                message="Are you sure you want to permanently delete this note?"
            />

        </SafeAreaView>
    );
}


// --- Stylesheet ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgMain, paddingTop: Platform.OS === 'android' ? 35 : 0 },
  fullScreenLoader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bgMain },
  header: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderColor,
    alignItems: 'center',
  },
  headerTitle: {
      fontFamily: FONT_FAMILY.playfair,
      fontSize: 24,
      color: COLORS.textPrimary,
  },
  controlsContainer: {
      paddingHorizontal: 20,
      paddingTop: 15,
  },
  searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.bgCard,
      borderRadius: 12,
      paddingHorizontal: 15,
      borderWidth: 1,
      borderColor: COLORS.borderColor,
  },
  searchIcon: {
      marginRight: 10,
  },
  searchInput: {
      flex: 1,
      fontFamily: FONT_FAMILY.poppins,
      fontSize: 15,
      color: COLORS.textPrimary,
      height: 48,
  },
  filterContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginVertical: 15,
  },
  filterButton: {
      paddingHorizontal: 20,
      paddingVertical: 8,
      borderRadius: 20,
      marginHorizontal: 5,
      backgroundColor: COLORS.bgCard,
      borderWidth: 1,
      borderColor: COLORS.borderColor,
  },
  filterButtonActive: {
      backgroundColor: COLORS.accentPrimary,
      borderColor: COLORS.accentPrimary,
  },
  filterButtonText: {
      fontFamily: FONT_FAMILY.poppinsMedium,
      fontSize: 14,
      color: COLORS.textSecondary,
  },
  filterButtonTextActive: {
      color: COLORS.textOnAccent,
  },
  notesGrid: {
      flexDirection: 'row',
      paddingHorizontal: 10,
      paddingTop: 0,
  },
  column: {
      flex: 1,
      paddingHorizontal: 5,
  },
  noteCardContainer: {
      marginBottom: 10,
  },
  noteCard: {
      borderRadius: 18,
      padding: 15,
      shadowColor: COLORS.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 5,
      elevation: 4,
  },
  favoriteIcon: {
      position: 'absolute',
      top: 10,
      right: 10,
      padding: 5,
      zIndex: 1,
  },
  noteTitle: {
      fontFamily: FONT_FAMILY.poppinsBold,
      fontSize: 16,
      color: COLORS.textPrimary,
      marginBottom: 5,
      paddingRight: 25,
  },
  noteContent: {
      fontFamily: FONT_FAMILY.poppins,
      fontSize: 14,
      color: COLORS.textSecondary,
      lineHeight: 21,
  },
  privateNoteOverlay: {
      height: 80,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.7)',
      borderRadius: 10,
  },
  noteDate: {
      fontFamily: FONT_FAMILY.poppins,
      fontSize: 12,
      color: COLORS.textSecondary,
      marginTop: 10,
      textAlign: 'right',
      opacity: 0.7,
  },
  emptyListContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
  },
  emptyListText: {
      fontFamily: FONT_FAMILY.poppins,
      fontSize: 16,
      color: COLORS.textSecondary,
      marginTop: 15,
      textAlign: 'center',
  },
  createButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    zIndex: 10
  },
  createButtonGradient: {
      flex: 1,
      borderRadius: 30,
      justifyContent: 'center',
      alignItems: 'center',
  },
  
  // --- FAB Menu Styles ---
  fabOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.3)',
      zIndex: 9,
      justifyContent: 'flex-end',
      alignItems: 'flex-end',
      paddingRight: 30,
      paddingBottom: 100,
  },
  fabContainer: {
      alignItems: 'flex-end',
  },
  fabOption: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
  },
  fabLabel: {
      fontFamily: FONT_FAMILY.poppinsMedium,
      fontSize: 16,
      color: 'white',
      backgroundColor: 'rgba(0,0,0,0.6)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      marginRight: 15,
  },
  fabIconContainer: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: COLORS.accentPrimary,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 4,
  },
  
  // --- Editor Modal Styles ---
  editorSafeArea: {
    flex: 1,
    backgroundColor: COLORS.bgMain,
  },
  editorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderColor,
  },
  editorTitle: {
      fontFamily: FONT_FAMILY.poppinsBold,
      fontSize: 18,
      color: COLORS.textPrimary,
  },
  editorHeaderText: {
      fontFamily: FONT_FAMILY.poppinsMedium,
      fontSize: 16,
      color: COLORS.accentPrimaryDarker,
      padding: 5,
  },
  editorSaveButton: {
      fontWeight: 'bold',
  },
  editorSaveButtonDisabled: {
      color: COLORS.textSecondary,
      opacity: 0.5,
  },
  editorContentContainer: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 10,
  },
  editorTitleInput: {
      fontFamily: FONT_FAMILY.playfair,
      fontSize: 28,
      color: COLORS.textPrimary,
      paddingBottom: 15,
  },
  editorContentInput: {
      flex: 1,
      fontFamily: FONT_FAMILY.poppins,
      fontSize: 17,
      color: COLORS.textPrimary,
      lineHeight: 26,
      textAlignVertical: 'top',
  },
  editorToolbar: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderColor: COLORS.borderColor,
    backgroundColor: COLORS.bgMain,
  },
  toolbarButton: {
      padding: 10,
      marginHorizontal: 10,
  },

  // --- Viewer Modal Styles ---
  viewerSafeArea: {
    flex: 1,
    backgroundColor: COLORS.bgMain
  },
  viewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderColor,
  },
  viewerHeaderActions: {
      flexDirection: 'row',
      alignItems: 'center'
  },
  viewerButton: {
      paddingHorizontal: 10,
      paddingVertical: 5,
  },
  viewerContentContainer: {
      padding: 20,
  },
  viewerTitle: {
      fontFamily: FONT_FAMILY.playfair,
      fontSize: 28,
      color: COLORS.textPrimary,
      marginBottom: 8,
  },
  viewerDate: {
      fontFamily: FONT_FAMILY.poppins,
      fontSize: 13,
      color: COLORS.textSecondary,
      marginBottom: 20,
  },
  viewerContent: {
      fontFamily: FONT_FAMILY.poppins,
      fontSize: 17,
      color: COLORS.textPrimary,
      lineHeight: 28,
  },
  
  // --- Checklist Item Styles ---
  checklistItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 5,
  },
  checkbox: {
      width: 22,
      height: 22,
      borderRadius: 5,
      borderWidth: 2,
      borderColor: COLORS.textSecondary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
  },
  checklistItemText: {
      fontFamily: FONT_FAMILY.poppins,
      fontSize: 16,
      color: COLORS.textPrimary,
      flex: 1,
  },
  checklistItemTextChecked: {
      textDecorationLine: 'line-through',
      color: COLORS.textSecondary,
  },
  addChecklistItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 10,
      marginTop: 5,
  },
  addChecklistItemText: {
      fontFamily: FONT_FAMILY.poppins,
      fontSize: 16,
      color: COLORS.textSecondary,
      marginLeft: 10,
  },
  deleteItemButton: {
      padding: 5,
  },
  
  // --- Custom Alert/Modal Styles ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  alertTitle: {
    fontFamily: FONT_FAMILY.poppinsBold,
    fontSize: 20,
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  alertMessage: {
    fontFamily: FONT_FAMILY.poppins,
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  alertButtonContainer: {
    flexDirection: 'row',
    width: '100%',
  },
  alertButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  alertButtonCancel: {
    backgroundColor: COLORS.borderColor,
    marginRight: 10,
  },
  alertButtonConfirm: {
    backgroundColor: COLORS.accentPrimaryDarker,
  },
  alertButtonText: {
    fontFamily: FONT_FAMILY.poppinsBold,
    fontSize: 16,
    color: COLORS.textPrimary
  },
  createNoteOptions: {
      width: '100%',
  },
  createNoteButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.borderColor,
      padding: 15,
      borderRadius: 12,
      marginBottom: 10,
  },
  createNoteButtonText: {
      fontFamily: FONT_FAMILY.poppinsMedium,
      fontSize: 16,
      color: COLORS.textPrimary,
      marginLeft: 15,
  }
});
