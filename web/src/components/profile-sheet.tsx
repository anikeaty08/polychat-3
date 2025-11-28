"use client";

import { useState, useEffect, useRef } from "react";
import { useAccount, useWriteContract, useReadContract } from "wagmi";
import { polygonChatRegistryAbi, registryAddress } from "../lib/contracts";
import { useChatStore } from "../state/chat-store";

interface Props {
  open: boolean;
  onClose: () => void;
  required?: boolean; // If true, profile must be created (can't close)
}

export function ProfileSheet({ open, onClose, required = false }: Props) {
  const { address } = useAccount();
  const { profile, setProfile } = useChatStore();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [checkingUsername, setCheckingUsername] = useState(false);
  const { writeContractAsync } = useWriteContract();
  
  // Fetch profile from contract when modal opens
  const { data: contractProfile, refetch: refetchProfile } = useReadContract({
    address: registryAddress,
    abi: polygonChatRegistryAbi,
    functionName: "getProfile",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && open,
    },
  });

  // Load profile data when modal opens
  useEffect(() => {
    if (open && address) {
      // Always refetch when modal opens
      refetchProfile();
    }
  }, [open, address]); // Removed refetchProfile from dependencies
  
  // Update form fields when contract profile data is available (only once)
  const hasLoadedRef = useRef(false);
  
  useEffect(() => {
    if (!open) {
      hasLoadedRef.current = false;
      return;
    }
    
    // Only load once when modal opens and data is available
    if (contractProfile && (contractProfile as any).exists && !hasLoadedRef.current) {
      const p = contractProfile as any;
      setUsername(p.username || "");
      setDisplayName(p.displayName || "");
      setBio(p.bio || "");
      // Also update store (only if different to avoid loops)
      const currentProfile = {
        username: p.username,
        displayName: p.displayName,
        bio: p.bio,
        avatarCid: p.avatarCid,
      };
      setProfile(currentProfile);
      hasLoadedRef.current = true;
    } else if (!contractProfile && profile && open && !hasLoadedRef.current) {
      // Fallback to store data if contract data not loaded yet
      setUsername(profile.username || "");
      setDisplayName(profile.displayName || "");
      setBio(profile.bio || "");
      hasLoadedRef.current = true;
    }
  }, [open, contractProfile]); // Removed profile and setProfile from dependencies
  
  // Check if username is available
  const { data: usernameOwner, refetch: checkUsername } = useReadContract({
    address: registryAddress,
    abi: polygonChatRegistryAbi,
    functionName: "ownerOfUsername",
    args: username ? [username] : undefined,
    query: {
      enabled: false, // Only check when manually triggered
    },
  });

  // Check username availability
  useEffect(() => {
    if (!username || username.length < 3) {
      setUsernameError("");
      return;
    }

    const timeoutId = setTimeout(async () => {
      setCheckingUsername(true);
      setUsernameError("");
      try {
        const result = await checkUsername();
        const owner = result.data as `0x${string}` | undefined;
        if (owner && owner !== "0x0000000000000000000000000000000000000000") {
          if (owner.toLowerCase() !== address?.toLowerCase()) {
            setUsernameError("Username is already taken");
          } else {
            setUsernameError("");
          }
        } else {
          setUsernameError("");
        }
      } catch (err) {
        console.error("Error checking username:", err);
      } finally {
        setCheckingUsername(false);
      }
    }, 500); // Debounce 500ms

    return () => clearTimeout(timeoutId);
  }, [username, address, checkUsername]);

  // Warn if contract address is not set
  if (registryAddress === "0x0000000000000000000000000000000000000000") {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-3xl border border-red-800 bg-zinc-950/95 p-6 shadow-2xl">
          <h2 className="text-lg font-semibold text-red-400 mb-2">Configuration Error</h2>
          <p className="text-sm text-zinc-300 mb-4">
            Contract address is not set. Please set <code className="text-xs bg-zinc-900 px-2 py-1 rounded">NEXT_PUBLIC_CHAT_REGISTRY_ADDRESS</code> in your <code className="text-xs bg-zinc-900 px-2 py-1 rounded">.env</code> file.
          </p>
          <p className="text-xs text-zinc-500 mb-4">
            Deployed contract address: <code className="text-xs bg-zinc-900 px-2 py-1 rounded">0x32593a5A622baC68B58A19315A55eF9e785C9F0E</code>
          </p>
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  async function uploadAvatar(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/lighthouse/upload", {
        method: "POST",
        body: formData,
      });

      // Get response text first to see what we're actually getting
      const responseText = await res.text();
      console.log("Upload response status:", res.status);
      console.log("Upload response text:", responseText);

      if (!res.ok) {
        let body: any = {};
        try {
          body = JSON.parse(responseText);
        } catch (e) {
          // If not JSON, use the text as error message
          throw new Error(`Upload failed (${res.status}): ${responseText || "Unknown error"}`);
        }
        
        const errorMsg = body.details || body.error || body.message || `Upload failed with status ${res.status}`;
        console.error("Upload error details:", body);
        throw new Error(errorMsg);
      }

      // Parse successful response
      let data: { cid: string };
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Invalid response format: ${responseText}`);
      }

      if (!data.cid) {
        console.error("Response data:", data);
        throw new Error("No CID returned from upload. Response: " + JSON.stringify(data));
      }
      
      return data.cid;
    } catch (err) {
      console.error("Avatar upload failed:", err);
      if (err instanceof Error) {
        throw err;
      }
      throw new Error("Failed to upload avatar: " + String(err));
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!address) return;
    if (usernameError) return;
    if (checkingUsername) return;
    
    setLoading(true);
    try {
      let avatarCid = profile?.avatarCid ?? "";

      if (avatarFile) {
        avatarCid = await uploadAvatar(avatarFile);
      }

      // Check if profile exists by checking contract
      const currentProfile = contractProfile as any;
      const profileExists = currentProfile && currentProfile.exists;
      
      if (!profileExists) {
        // Create new profile
        console.log("Creating new profile...");
        await writeContractAsync({
          address: registryAddress,
          abi: polygonChatRegistryAbi,
          functionName: "registerProfile",
          args: [username, avatarCid, bio, displayName],
        });
        console.log("Profile created successfully!");
      } else {
        // Update existing profile
        console.log("Updating existing profile...");
        const currentUsername = currentProfile.username || profile?.username || "";
        
        // Check if username changed (case-insensitive comparison)
        const usernameChanged = username && username.trim().toLowerCase() !== currentUsername.trim().toLowerCase();
        
        if (usernameChanged) {
          console.log("Username changed, updating username...");
          // Username changed - update it first
          try {
            await writeContractAsync({
              address: registryAddress,
              abi: polygonChatRegistryAbi,
              functionName: "changeUsername",
              args: [username],
            });
            console.log("Username updated successfully!");
          } catch (err) {
            console.error("Failed to update username:", err);
            throw err; // Re-throw to show error to user
          }
        }
        
        // Always update profile (avatar, bio, displayName)
        console.log("Updating profile details...");
        try {
          await writeContractAsync({
            address: registryAddress,
            abi: polygonChatRegistryAbi,
            functionName: "updateProfile",
            args: [avatarCid, bio, displayName],
          });
          console.log("Profile updated successfully!");
        } catch (err) {
          console.error("Failed to update profile:", err);
          throw err; // Re-throw to show error to user
        }
      }

      setProfile({
        username,
        displayName: displayName || username,
        bio,
        avatarCid,
      });

      // Refetch profile from contract
      await refetchProfile();

      // Close modal
      onClose();
    } catch (err) {
      console.error("Profile save error:", err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      alert(`Failed to save profile: ${errorMsg}\n\nPlease check:\n- Your wallet is connected\n- You have Amoy MATIC for gas\n- Lighthouse API key is set\n- Contract address is correct`);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !required) {
          onClose();
        }
      }}
    >
      <div 
        className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950/95 p-6 shadow-2xl relative z-50"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-zinc-50 mb-1">
          {required ? "Create Your Profile" : "Edit Your Profile"}
        </h2>
        <p className="mb-4 text-xs text-zinc-500">
          {required 
            ? "Create your profile to start chatting. Username is stored on Polygon, avatar and bio on Lighthouse."
            : "Update your profile information. All fields are editable."}
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-300">
              Username
            </label>
            <input
              required
              minLength={3}
              maxLength={32}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. onchain_wizard"
              disabled={loading}
              className={`w-full rounded-xl border ${
                usernameError
                  ? "border-red-500"
                  : "border-zinc-800 focus:border-violet-500"
              } bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100 outline-none disabled:opacity-50 disabled:cursor-not-allowed`}
            />
            {checkingUsername && (
              <p className="text-[11px] text-zinc-500">Checking availability...</p>
            )}
            {usernameError && (
              <p className="text-[11px] text-red-400">{usernameError}</p>
            )}
            {!usernameError && username.length >= 3 && !checkingUsername && (
              <p className="text-[11px] text-green-400">✓ Username available</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-300">
              Display name
            </label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Optional, what friends see"
              disabled={loading}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-300">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="Say something about yourself"
              disabled={loading}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-300">
              Avatar image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
              className="block w-full text-xs text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-zinc-100 hover:file:bg-zinc-700"
            />
            <p className="text-[11px] text-zinc-500">
              We store just a reference (CID) on-chain; the file lives on
              Lighthouse.
            </p>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            {!required && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-900"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading || !!usernameError || checkingUsername || !username || username.length < 3}
              className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Saving..." : (contractProfile && (contractProfile as any).exists) ? "Update Profile" : "Create Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


